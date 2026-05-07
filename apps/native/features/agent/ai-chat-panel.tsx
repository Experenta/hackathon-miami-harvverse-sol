import { MaterialIcons } from "@expo/vector-icons";
import { api } from "@havverse/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Card } from "@/components/ui";
import { useTheme } from "@/theme";

type AgentRole = "farmer" | "partner";

interface AiChatPanelProps {
  wallet: string;
  role: AgentRole;
  lotCode?: string;
  title?: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
}

interface UIMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "tool" | string;
  content?: string;
  parts?: Array<{ type?: string; text?: string }>;
}

interface VisibleMessage extends UIMessage {
  text: string;
}

const MESSAGE_PAGE_SIZE = 80;

export function AiChatPanel({
  wallet,
  role,
  lotCode = "",
  title = "Ask Harvverse AI",
  description,
  style,
}: AiChatPanelProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const normalizedLotCode = lotCode.trim();
  const contextLabel = getContextLabel(role, normalizedLotCode);
  const accentColor =
    role === "partner"
      ? theme.colors.role.partner.foreground
      : theme.colors.role.farmer.foreground;
  const entryVariant = role === "partner" ? "accent" : "selected";
  const badgeTone = role === "partner" ? "partner" : "brand";

  const getOrCreateThread = useMutation(api.agentChat.getOrCreateThread);
  const resetThread = useMutation(api.agentChat.resetThread);
  const sendMessage = useMutation(api.agentChat.sendMessage);
  const paginationOpts = useMemo(
    () => ({ cursor: null, numItems: MESSAGE_PAGE_SIZE }),
    [],
  );

  const messagesResult = useQuery(
    api.agentChat.listThreadMessages,
    threadId ? { threadId, paginationOpts } : "skip",
  );

  const messages = useMemo(
    () => (messagesResult?.page ?? []) as UIMessage[],
    [messagesResult?.page],
  );
  const visibleMessages = useMemo(
    () =>
      messages
        .map((message) => ({
          ...message,
          text: getMessageText(message),
        }))
        .filter(
          (message): message is VisibleMessage =>
            Boolean(message.text) &&
            message.role !== "tool" &&
            message.role !== "system",
        ),
    [messages],
  );
  const suggestions = useMemo(
    () => getQuickPrompts(role, normalizedLotCode),
    [normalizedLotCode, role],
  );

  const lastVisibleRole =
    visibleMessages.length > 0
      ? visibleMessages[visibleMessages.length - 1].role
      : null;
  const isMessagesLoading = Boolean(threadId && messagesResult === undefined);
  const isBusy = isSending || awaitingResponse || isClearing;
  const canSend =
    Boolean(input.trim()) && Boolean(threadId) && !isThreadLoading && !isBusy;
  const canClear = Boolean(threadId) && !isThreadLoading && !isBusy;

  useEffect(() => {
    setThreadId(null);
    setInput("");
    setThreadError(null);
    setChatError(null);
    setAwaitingResponse(false);
  }, [normalizedLotCode, role, wallet]);

  useEffect(() => {
    if (awaitingResponse && lastVisibleRole === "assistant") {
      setAwaitingResponse(false);
    }
  }, [awaitingResponse, lastVisibleRole]);

  useEffect(() => {
    if (!isOpen) return;

    const timeout = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeout);
  }, [awaitingResponse, isOpen, visibleMessages.length]);

  const ensureThread = useCallback(async () => {
    if (threadId) return threadId;
    if (isThreadLoading) return null;
    if (!wallet) {
      setThreadError("Connect a wallet before starting an AI chat.");
      return null;
    }

    setThreadError(null);
    setIsThreadLoading(true);

    try {
      const id = await getOrCreateThread({
        wallet,
        role,
        lotCode: normalizedLotCode,
      });
      setThreadId(id);
      return id;
    } catch (error) {
      setThreadError(getErrorMessage(error, "Unable to start AI chat."));
      return null;
    } finally {
      setIsThreadLoading(false);
    }
  }, [
    getOrCreateThread,
    isThreadLoading,
    normalizedLotCode,
    role,
    threadId,
    wallet,
  ]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    void ensureThread();
  }, [ensureThread]);

  const sendPrompt = useCallback(
    async (promptOverride?: string) => {
      const prompt = (promptOverride ?? input).trim();
      if (!prompt || isBusy) return;

      const activeThreadId = threadId ?? (await ensureThread());
      if (!activeThreadId) return;

      setInput("");
      setChatError(null);
      setIsSending(true);
      setAwaitingResponse(true);

      try {
        await sendMessage({
          threadId: activeThreadId,
          message: prompt,
          lotCode: normalizedLotCode,
        });
      } catch (error) {
        setInput(prompt);
        setAwaitingResponse(false);
        setChatError(getErrorMessage(error, "Unable to send message."));
      } finally {
        setIsSending(false);
      }
    },
    [ensureThread, input, isBusy, normalizedLotCode, sendMessage, threadId],
  );

  const clearChat = useCallback(async () => {
    if (!wallet || !threadId || isBusy || isThreadLoading) return;

    setIsClearing(true);
    setChatError(null);

    try {
      const id = await resetThread({
        wallet,
        role,
        lotCode: normalizedLotCode,
      });
      setThreadId(id);
      setInput("");
      setAwaitingResponse(false);
    } catch (error) {
      setChatError(getErrorMessage(error, "Unable to clear chat."));
    } finally {
      setIsClearing(false);
    }
  }, [
    isBusy,
    isThreadLoading,
    normalizedLotCode,
    resetThread,
    role,
    threadId,
    wallet,
  ]);

  const confirmClearChat = useCallback(() => {
    if (!canClear) return;

    Alert.alert(
      "Clear chat?",
      `This starts a new AI thread for ${contextLabel}. Previous messages will no longer appear here.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => void clearChat(),
        },
      ],
    );
  }, [canClear, clearChat, contextLabel]);

  return (
    <>
      <TouchableOpacity
        accessibilityLabel={`${title}. ${contextLabel}`}
        accessibilityRole="button"
        activeOpacity={0.9}
        disabled={!wallet}
        onPress={openChat}
        style={[{ opacity: wallet ? 1 : 0.6 }, style]}
      >
        <Card
          variant={entryVariant}
          style={{
            borderRadius: theme.radius.xl,
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
          }}
        >
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: theme.spacing.sm,
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                alignItems: "center",
                flexDirection: "row",
                flex: 1,
                gap: theme.spacing.sm,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  backgroundColor:
                    role === "partner"
                      ? theme.colors.role.partner.background
                      : theme.colors.role.farmer.background,
                  borderColor:
                    role === "partner"
                      ? theme.colors.role.partner.border
                      : theme.colors.role.farmer.border,
                  borderRadius: theme.radius.pill,
                  borderWidth: theme.borderWidth.thin,
                  height: 42,
                  justifyContent: "center",
                  width: 42,
                }}
              >
                <MaterialIcons
                  color={accentColor}
                  name="chat-bubble-outline"
                  size={21}
                />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text
                  style={[
                    theme.typography.text1,
                    { color: theme.colors.text.primary },
                  ]}
                >
                  {title}
                </Text>
                <Text
                  style={[
                    theme.typography.bodySm,
                    { color: theme.colors.text.secondary },
                  ]}
                  numberOfLines={2}
                >
                  {description ?? getEntryDescription(role, normalizedLotCode)}
                </Text>
              </View>
            </View>
            <Badge label="AI" tone={badgeTone} />
          </View>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: theme.spacing.xs,
            }}
          >
            <View
              style={{
                backgroundColor: accentColor,
                borderRadius: theme.radius.pill,
                height: 8,
                width: 8,
              }}
            />
            <Text
              style={[
                theme.typography.caption,
                { color: theme.colors.text.muted },
              ]}
            >
              {contextLabel}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
        presentationStyle="fullScreen"
        visible={isOpen}
      >
        <SafeAreaView
          edges={["top", "left", "right"]}
          style={{ flex: 1, backgroundColor: theme.colors.background.app }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 12}
            style={{ flex: 1 }}
          >
            <View
              style={{
                borderBottomColor: theme.colors.border.default,
                borderBottomWidth: theme.borderWidth.thin,
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.xl,
                paddingVertical: theme.spacing.md,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  gap: theme.spacing.md,
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text
                    style={[
                      theme.typography.labelSm,
                      {
                        color: accentColor,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      },
                    ]}
                  >
                    Harvverse AI
                  </Text>
                  <Text
                    style={[
                      theme.typography.text2,
                      { color: theme.colors.text.primary },
                    ]}
                  >
                    {contextLabel}
                  </Text>
                </View>
                <View
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    gap: theme.spacing.xs,
                  }}
                >
                  <HeaderIconButton
                    accessibilityLabel="Clear AI chat"
                    disabled={!canClear}
                    iconName="delete-outline"
                    loading={isClearing}
                    onPress={confirmClearChat}
                  />
                  <HeaderIconButton
                    accessibilityLabel="Close AI chat"
                    iconName="close"
                    onPress={() => setIsOpen(false)}
                  />
                </View>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              contentContainerStyle={{
                flexGrow: 1,
                gap: theme.spacing.md,
                justifyContent:
                  visibleMessages.length === 0 &&
                  !isMessagesLoading &&
                  !isThreadLoading
                    ? "center"
                    : "flex-start",
                padding: theme.spacing.xl,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
            >
              {threadError ? (
                <InlineNotice
                  message={threadError}
                  onRetry={() => void ensureThread()}
                />
              ) : null}
              {chatError ? <InlineNotice message={chatError} /> : null}

              {isThreadLoading || isMessagesLoading ? (
                <LoadingBubble
                  label={
                    isThreadLoading
                      ? "Opening secure thread..."
                      : "Loading conversation..."
                  }
                />
              ) : isClearing ? (
                <LoadingBubble label="Starting a new thread..." />
              ) : visibleMessages.length === 0 ? (
                <EmptyState
                  contextLabel={contextLabel}
                  disabled={!threadId || isBusy}
                  onSelectPrompt={(prompt) => void sendPrompt(prompt)}
                  prompts={suggestions}
                  role={role}
                />
              ) : (
                visibleMessages.map((message, index) => (
                  <ChatBubble
                    key={`${message.id ?? "message"}-${index}`}
                    message={message}
                  />
                ))
              )}

              {isBusy ? <ThinkingBubble /> : null}
            </ScrollView>

            <View
              style={{
                backgroundColor: theme.colors.surface.default,
                borderTopColor: theme.colors.border.default,
                borderTopWidth: theme.borderWidth.thin,
                gap: theme.spacing.xs,
                paddingBottom:
                  Platform.OS === "ios" ? theme.spacing.lg : theme.spacing.md,
                paddingHorizontal: theme.spacing.xl,
                paddingTop: theme.spacing.md,
              }}
            >
              <View
                style={{
                  alignItems: "flex-end",
                  flexDirection: "row",
                  gap: theme.spacing.sm,
                }}
              >
                <TextInput
                  accessibilityLabel="Message Harvverse AI"
                  editable={Boolean(threadId) && !isThreadLoading && !isBusy}
                  maxLength={800}
                  multiline
                  onChangeText={setInput}
                  placeholder="Ask about this context..."
                  placeholderTextColor={theme.colors.input.placeholder}
                  style={[
                    theme.typography.bodyMd,
                    {
                      backgroundColor: theme.colors.input.background,
                      borderColor: theme.colors.input.border,
                      borderRadius: theme.radius.lg,
                      borderWidth: theme.borderWidth.thin,
                      color: theme.colors.input.text,
                      flex: 1,
                      maxHeight: 120,
                      minHeight: 46,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: 11,
                      textAlignVertical: "top",
                    },
                  ]}
                  value={input}
                />
                <TouchableOpacity
                  accessibilityLabel="Send AI message"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canSend }}
                  activeOpacity={0.85}
                  disabled={!canSend}
                  onPress={() => void sendPrompt()}
                  style={{
                    alignItems: "center",
                    backgroundColor: canSend
                      ? theme.colors.action.primary.background
                      : theme.colors.action.disabled.background,
                    borderColor: canSend
                      ? theme.colors.action.primary.borderColor
                      : theme.colors.action.disabled.borderColor,
                    borderRadius: theme.radius.lg,
                    borderWidth: canSend
                      ? theme.colors.action.primary.borderWidth
                      : theme.colors.action.disabled.borderWidth,
                    height: 46,
                    justifyContent: "center",
                    width: 46,
                  }}
                >
                  {isSending ? (
                    <ActivityIndicator
                      color={theme.colors.action.primary.foreground}
                      size="small"
                    />
                  ) : (
                    <MaterialIcons
                      color={
                        canSend
                          ? theme.colors.action.primary.foreground
                          : theme.colors.action.disabled.foreground
                      }
                      name="send"
                      size={20}
                    />
                  )}
                </TouchableOpacity>
              </View>
              <Text
                style={[
                  theme.typography.caption,
                  { color: theme.colors.text.muted, textAlign: "center" },
                ]}
              >
                Harvverse AI explains verified data only. It cannot sign
                transactions.
              </Text>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function HeaderIconButton({
  accessibilityLabel,
  disabled = false,
  iconName,
  loading = false,
  onPress,
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  iconName: keyof typeof MaterialIcons.glyphMap;
  loading?: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: theme.colors.action.secondary.background,
        borderColor: theme.colors.action.secondary.borderColor,
        borderRadius: theme.radius.pill,
        borderWidth: theme.colors.action.secondary.borderWidth,
        height: 42,
        justifyContent: "center",
        opacity: isDisabled ? 0.48 : 1,
        width: 42,
      }}
    >
      {loading ? (
        <ActivityIndicator
          color={theme.colors.action.secondary.foreground}
          size="small"
        />
      ) : (
        <MaterialIcons
          color={theme.colors.action.secondary.foreground}
          name={iconName}
          size={22}
        />
      )}
    </TouchableOpacity>
  );
}

function ChatBubble({ message }: { message: VisibleMessage }) {
  const { theme } = useTheme();
  const isUser = message.role === "user";
  const palette = isUser
    ? {
        background: theme.colors.action.primary.background,
        border: theme.colors.action.primary.background,
        foreground: theme.colors.action.primary.foreground,
      }
    : {
        background: theme.colors.surface.raised,
        border: theme.colors.border.default,
        foreground: theme.colors.text.primary,
      };

  return (
    <View
      style={{
        alignItems: isUser ? "flex-end" : "flex-start",
        width: "100%",
      }}
    >
      <View
        style={{
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: theme.radius.lg,
          borderTopRightRadius: isUser ? theme.radius.sm : theme.radius.lg,
          borderTopLeftRadius: isUser ? theme.radius.lg : theme.radius.sm,
          borderWidth: theme.borderWidth.thin,
          maxWidth: "86%",
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        {isUser ? (
          <Text
            style={[theme.typography.bodySm, { color: palette.foreground }]}
          >
            {message.text}
          </Text>
        ) : (
          <MarkdownMessageText color={palette.foreground} text={message.text} />
        )}
      </View>
    </View>
  );
}

function MarkdownMessageText({ color, text }: { color: string; text: string }) {
  const { theme } = useTheme();
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const rendered = lines
    .map((line, index) => renderMarkdownLine(line, index, color))
    .filter(Boolean);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {rendered.length > 0 ? (
        rendered
      ) : (
        <Text style={[theme.typography.bodySm, { color }]}>{text}</Text>
      )}
    </View>
  );
}

function renderMarkdownLine(line: string, index: number, color: string) {
  const trimmed = line.trim();

  if (!trimmed) return null;

  if (/^-{3,}$/.test(trimmed)) {
    return <MarkdownDivider key={`divider-${index}`} />;
  }

  const heading = trimmed.match(/^#{1,3}\s+(.+)$/);
  if (heading) {
    return (
      <MarkdownLineText
        key={`heading-${index}`}
        color={color}
        text={heading[1]}
        variant="heading"
      />
    );
  }

  const bullet = trimmed.match(/^[-*]\s+(.+)$/);
  if (bullet) {
    return (
      <MarkdownBulletLine
        key={`bullet-${index}`}
        color={color}
        text={bullet[1]}
      />
    );
  }

  return (
    <MarkdownLineText
      key={`line-${index}`}
      color={color}
      text={trimmed}
      variant="body"
    />
  );
}

function MarkdownLineText({
  color,
  text,
  variant,
}: {
  color: string;
  text: string;
  variant: "body" | "heading";
}) {
  const { theme } = useTheme();
  const baseStyle =
    variant === "heading"
      ? [theme.typography.text1, { color }]
      : [theme.typography.bodySm, { color }];

  return (
    <Text style={baseStyle}>
      {renderInlineMarkdown(text, color, variant === "heading")}
    </Text>
  );
}

function MarkdownBulletLine({ color, text }: { color: string; text: string }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        alignItems: "flex-start",
        flexDirection: "row",
        gap: theme.spacing.xs,
      }}
    >
      <Text style={[theme.typography.bodySm, { color }]}>{"\u2022"}</Text>
      <Text style={[theme.typography.bodySm, { color, flex: 1 }]}>
        {renderInlineMarkdown(text, color, false)}
      </Text>
    </View>
  );
}

function MarkdownDivider() {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.border.default,
        height: theme.borderWidth.thin,
        marginVertical: theme.spacing.xs,
        opacity: 0.8,
        width: "100%",
      }}
    />
  );
}

function renderInlineMarkdown(text: string, color: string, isHeading: boolean) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((segment, index) => {
      const isBold = segment.startsWith("**") && segment.endsWith("**");
      const content = isBold ? segment.slice(2, -2) : segment;

      return (
        <Text
          key={`${content}-${index}`}
          style={
            isBold
              ? {
                  color,
                  fontWeight: isHeading ? "800" : "700",
                }
              : undefined
          }
        >
          {content}
        </Text>
      );
    });
}

function EmptyState({
  contextLabel,
  disabled,
  onSelectPrompt,
  prompts,
  role,
}: {
  contextLabel: string;
  disabled: boolean;
  onSelectPrompt: (prompt: string) => void;
  prompts: string[];
  role: AgentRole;
}) {
  const { theme } = useTheme();
  const accentColor =
    role === "partner"
      ? theme.colors.role.partner.foreground
      : theme.colors.role.farmer.foreground;

  return (
    <View
      style={{
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.xl,
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor:
            role === "partner"
              ? theme.colors.role.partner.background
              : theme.colors.role.farmer.background,
          borderColor:
            role === "partner"
              ? theme.colors.role.partner.border
              : theme.colors.role.farmer.border,
          borderRadius: theme.radius.pill,
          borderWidth: theme.borderWidth.thin,
          height: 54,
          justifyContent: "center",
          width: 54,
        }}
      >
        <MaterialIcons color={accentColor} name="auto-awesome" size={26} />
      </View>
      <View style={{ alignItems: "center", gap: theme.spacing.xs }}>
        <Text
          style={[
            theme.typography.text2,
            { color: theme.colors.text.primary, textAlign: "center" },
          ]}
        >
          Start with {contextLabel}
        </Text>
        <Text
          style={[
            theme.typography.bodySm,
            {
              color: theme.colors.text.secondary,
              maxWidth: 320,
              textAlign: "center",
            },
          ]}
        >
          Ask about farm data, revenue splits, sensor context, partnerships, or
          what is mirrored on-chain.
        </Text>
      </View>
      <View style={{ gap: theme.spacing.xs, width: "100%" }}>
        {prompts.map((prompt) => (
          <TouchableOpacity
            accessibilityLabel={`Ask: ${prompt}`}
            accessibilityRole="button"
            disabled={disabled}
            key={prompt}
            onPress={() => onSelectPrompt(prompt)}
            style={{
              backgroundColor: theme.colors.surface.raised,
              borderColor: theme.colors.border.default,
              borderRadius: theme.radius.md,
              borderWidth: theme.borderWidth.thin,
              opacity: disabled ? 0.6 : 1,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
            }}
          >
            <Text
              style={[
                theme.typography.labelMd,
                { color: theme.colors.text.primary, textAlign: "center" },
              ]}
            >
              {prompt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function InlineNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.feedback.warning.background,
        borderColor: theme.colors.feedback.warning.border,
        borderRadius: theme.radius.md,
        borderWidth: theme.borderWidth.thin,
        gap: theme.spacing.xs,
        padding: theme.spacing.md,
      }}
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: theme.spacing.xs,
        }}
      >
        <MaterialIcons
          color={theme.colors.feedback.warning.accent}
          name="error-outline"
          size={18}
        />
        <Text
          style={[
            theme.typography.labelMd,
            { color: theme.colors.feedback.warning.foreground },
          ]}
        >
          AI chat needs attention
        </Text>
      </View>
      <Text
        style={[
          theme.typography.bodySm,
          { color: theme.colors.feedback.warning.foreground },
        ]}
      >
        {message}
      </Text>
      {onRetry ? (
        <TouchableOpacity
          accessibilityLabel="Retry AI chat"
          accessibilityRole="button"
          onPress={onRetry}
          style={{
            alignSelf: "flex-start",
            borderColor: theme.colors.feedback.warning.border,
            borderRadius: theme.radius.sm,
            borderWidth: theme.borderWidth.thin,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
          }}
        >
          <Text
            style={[
              theme.typography.labelMd,
              { color: theme.colors.feedback.warning.foreground },
            ]}
          >
            Retry
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function LoadingBubble({ label }: { label: string }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: theme.spacing.sm,
        justifyContent: "center",
        paddingVertical: theme.spacing.xl,
      }}
    >
      <ActivityIndicator color={theme.colors.action.primary.background} />
      <Text
        style={[
          theme.typography.bodySm,
          { color: theme.colors.text.secondary },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ThinkingBubble() {
  const { theme } = useTheme();

  return (
    <View style={{ alignItems: "flex-start", width: "100%" }}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: theme.colors.surface.raised,
          borderColor: theme.colors.border.default,
          borderRadius: theme.radius.lg,
          borderTopLeftRadius: theme.radius.sm,
          borderWidth: theme.borderWidth.thin,
          flexDirection: "row",
          gap: theme.spacing.xs,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}
      >
        <ActivityIndicator color={theme.colors.text.secondary} size="small" />
        <Text
          style={[
            theme.typography.bodySm,
            { color: theme.colors.text.secondary },
          ]}
        >
          Reviewing verified data...
        </Text>
      </View>
    </View>
  );
}

function getContextLabel(role: AgentRole, lotCode: string) {
  if (lotCode) return `Lot ${lotCode}`;
  return role === "partner" ? "Partner workspace" : "Farmer workspace";
}

function getEntryDescription(role: AgentRole, lotCode: string) {
  if (lotCode) {
    return role === "partner"
      ? "Get a concise read on this lot before reserving."
      : "Check readiness, manifests, and lot details before publishing.";
  }

  return role === "partner"
    ? "Compare catalog lots and your active partnerships."
    : "Review your lots and publishing priorities.";
}

function getQuickPrompts(role: AgentRole, lotCode: string) {
  if (lotCode) {
    return role === "partner"
      ? [
          "Summarize this lot",
          "Explain the revenue split",
          "What could block reservation?",
        ]
      : [
          "Summarize publish readiness",
          "Explain the lot package",
          "What should I verify before publishing?",
        ];
  }

  return role === "partner"
    ? [
        "Summarize my partnerships",
        "Compare available catalog lots",
        "How should I evaluate a lot?",
      ]
    : [
        "Summarize my lot portfolio",
        "Which lots need attention?",
        "How do I prepare to publish?",
      ];
}

function getMessageText(message: UIMessage) {
  if (typeof message.content === "string" && message.content.trim()) {
    return message.content.trim();
  }

  return (message.parts ?? [])
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("")
    .trim();
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
