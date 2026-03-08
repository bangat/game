using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Text;
using System.Text.Json.Serialization;
using System.Windows.Forms;

namespace MiniGameTelegramBridge;

internal static class Program
{
    private const string MutexName = "MiniGameTelegramBridge.Singleton";

    [STAThread]
    private static async Task<int> Main(string[] args)
    {
        try
        {
            var configPath = BridgeConfig.ResolveConfigPath(AppContext.BaseDirectory);
            if (HasArg(args, "--capture-vscode-point"))
            {
                var captureConfig = BridgeConfig.Load(configPath);
                var capture = VsCodeBridge.CaptureClickPoint(captureConfig);
                if (!capture.Ok)
                {
                    BridgeLog.Write($"capture failed: {capture.Message}");
                    Console.Error.WriteLine(capture.Message);
                    return 1;
                }

                BridgeConfig.SaveClickPoint(configPath, capture.X, capture.Y);
                BridgeLog.Write($"capture saved: ({capture.X},{capture.Y})");
                Console.WriteLine($"saved ({capture.X},{capture.Y})");
                return 0;
            }

            if (HasArg(args, "--bind-current-vscode-window"))
            {
                var bindConfig = BridgeConfig.Load(configPath);
                if (!VsCodeBridge.TryBindForegroundVsCodeWindow(bindConfig, out var bindMessage))
                {
                    BridgeLog.Write($"bind failed: {bindMessage}");
                    Console.Error.WriteLine(bindMessage);
                    return 1;
                }

                BridgeLog.Write($"bind saved: {bindMessage}");
                Console.WriteLine(bindMessage);
                return 0;
            }

            if (HasArg(args, "--clear-vscode-window-bind"))
            {
                BridgeConfig.ClearPinnedWindow(configPath);
                BridgeLog.Write("bind cleared");
                Console.WriteLine("cleared");
                return 0;
            }

            var sendText = ReadOptionValue(args, "--send-text");
            if (!string.IsNullOrWhiteSpace(sendText))
            {
                var sendConfig = BridgeConfig.Load(configPath);
                var sendEnter = !HasArg(args, "--no-enter");
                if (!VsCodeBridge.TrySendLine(sendConfig, sendText, sendEnter, out var sendMessage))
                {
                    BridgeLog.Write($"direct send failed: {sendMessage}");
                    Console.Error.WriteLine(sendMessage);
                    return 1;
                }

                BridgeLog.Write($"direct send ok: {sendMessage}");
                Console.WriteLine(sendMessage);
                return 0;
            }

            using var mutex = new Mutex(false, MutexName, out var createdNew);
            if (!createdNew)
            {
                BridgeLog.Write("bridge already running");
                return 0;
            }

            using var http = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(20)
            };
            http.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("MiniGameTelegramBridge", "1.0"));

            var bridge = new TelegramBridge(configPath, http);
            return await bridge.RunAsync(HasArg(args, "--run-once") || HasArg(args, "--once")).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            BridgeLog.Write($"fatal: {ex}");
            Console.Error.WriteLine(ex.Message);
            return 1;
        }
    }

    private static bool HasArg(IEnumerable<string> args, string value)
    {
        return args.Any(x => string.Equals(x, value, StringComparison.OrdinalIgnoreCase));
    }

    private static string ReadOptionValue(IReadOnlyList<string> args, string option)
    {
        for (var i = 0; i < args.Count - 1; i++)
        {
            if (string.Equals(args[i], option, StringComparison.OrdinalIgnoreCase))
            {
                return args[i + 1];
            }
        }

        return string.Empty;
    }
}

internal sealed class TelegramBridge
{
    private readonly string _configPath;
    private readonly HttpClient _http;
    private BridgeConfig _config;
    private DateTime _configStampUtc;
    private long _offset;
    private bool _paused;

    public TelegramBridge(string configPath, HttpClient http)
    {
        _configPath = configPath;
        _http = http;
        _config = BridgeConfig.Load(configPath);
        _configStampUtc = File.GetLastWriteTimeUtc(configPath);
    }

    public async Task<int> RunAsync(bool runOnce)
    {
        if (string.IsNullOrWhiteSpace(_config.TelegramToken))
        {
            throw new InvalidOperationException("tele_config.ini Telegram.Token is missing.");
        }

        if (string.IsNullOrWhiteSpace(_config.ChatId))
        {
            throw new InvalidOperationException("tele_config.ini Telegram.ChatID is missing.");
        }

        _offset = await SyncToLatestAsync().ConfigureAwait(false);
        BridgeLog.Write($"bridge started: title={_config.WinTitle}, chat={_config.ChatId}");
        await SafeSendStatusAsync("미니게임지옥 텔레그램 브리지 실행됨\n이제 텍스트를 보내면 현재 VS Code 창으로 전달합니다.").ConfigureAwait(false);

        if (runOnce)
        {
            return 0;
        }

        while (true)
        {
            try
            {
                ReloadConfigIfChanged();
                if (!_paused)
                {
                    var updates = await GetUpdatesAsync(_offset + 1).ConfigureAwait(false);
                    foreach (var update in updates)
                    {
                        _offset = Math.Max(_offset, update.UpdateId);
                        await HandleUpdateAsync(update).ConfigureAwait(false);
                    }
                }
            }
            catch (Exception ex)
            {
                BridgeLog.Write($"loop error: {ex.Message}");
            }

            await Task.Delay(TimeSpan.FromMilliseconds(Math.Max(1000, _config.CheckIntervalMs))).ConfigureAwait(false);
        }
    }

    private async Task<long> SyncToLatestAsync()
    {
        var url = BuildApiUrl("getUpdates", "limit=1&offset=-1&timeout=1");
        using var response = await _http.GetAsync(url).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<TelegramGetUpdatesResponse>().ConfigureAwait(false);
        return payload?.Result is { Count: > 0 } result ? result.Max(x => x.UpdateId) : 0;
    }

    private async Task<IReadOnlyList<TelegramUpdate>> GetUpdatesAsync(long offset)
    {
        var url = BuildApiUrl("getUpdates", $"offset={offset}&limit=8&timeout=1");
        using var response = await _http.GetAsync(url).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadFromJsonAsync<TelegramGetUpdatesResponse>().ConfigureAwait(false);
        if (payload?.Ok != true || payload.Result is null)
        {
            return Array.Empty<TelegramUpdate>();
        }

        return payload.Result;
    }

    private async Task HandleUpdateAsync(TelegramUpdate update)
    {
        var message = update.Message;
        if (message is null || string.IsNullOrWhiteSpace(message.Text))
        {
            return;
        }

        var chatId = message.Chat?.Id.ToString() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(chatId))
        {
            return;
        }

        if (!string.Equals(chatId, _config.ChatId, StringComparison.Ordinal))
        {
            if (!_config.AutoBindChatId)
            {
                BridgeLog.Write($"ignored foreign chat: {chatId}");
                return;
            }

            _config.ChatId = chatId;
            BridgeConfig.SaveChatId(_configPath, chatId);
            BridgeLog.Write($"chat rebound: {chatId}");
        }

        var text = message.Text.Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            return;
        }

        BridgeLog.Write($"incoming: {text}");

        if (Matches(text, "/help", "도움말", "명령어"))
        {
            await SafeSendStatusAsync(
                "명령어\n" +
                "상태 : 브리지 상태 확인\n" +
                "중지 / 시작 : 수신 일시중지/재개\n" +
                "클릭모드 on/off : 저장된 좌표 클릭 사용\n" +
                "입력 <내용> : 붙여넣고 Enter\n" +
                "붙여넣기 <내용> : 붙여넣기만\n" +
                "기본값은 그냥 보내도 바로 입력").ConfigureAwait(false);
            return;
        }

        if (Matches(text, "상태", "/상태"))
        {
            var found = VsCodeBridge.TryResolveVsCodeWindow(_config, out _, out var title, out var windowDetail);
            var status = found ? $"연결 가능: {title}" : $"VS Code 창 없음 ({windowDetail})";
            await SafeSendStatusAsync(
                $"브리지 상태\n창: {status}\n고정바인딩: {(_config.HasPinnedWindow ? $"ON pid={_config.PinnedWindowProcessId}" : "OFF")}\n클릭모드: {(_config.UseClickFocus ? "ON" : "OFF")}\n핫키폴백: {(_config.AllowHotkeyFallbackWhenClickFocus ? "ON" : "OFF")}\n좌표: {_config.FocusClickX},{_config.FocusClickY}").ConfigureAwait(false);
            return;
        }

        if (Matches(text, "중지", "/중지"))
        {
            _paused = true;
            await SafeSendStatusAsync("미니게임지옥 브리지 일시중지").ConfigureAwait(false);
            return;
        }

        if (Matches(text, "시작", "/시작"))
        {
            _paused = false;
            await SafeSendStatusAsync("미니게임지옥 브리지 재개").ConfigureAwait(false);
            return;
        }

        if (Matches(text, "클릭모드 on", "/클릭모드 on"))
        {
            _config.UseClickFocus = true;
            BridgeConfig.SaveClickMode(_configPath, true);
            await SafeSendStatusAsync("클릭모드 ON").ConfigureAwait(false);
            return;
        }

        if (Matches(text, "클릭모드 off", "/클릭모드 off"))
        {
            _config.UseClickFocus = false;
            BridgeConfig.SaveClickMode(_configPath, false);
            await SafeSendStatusAsync("클릭모드 OFF").ConfigureAwait(false);
            return;
        }

        var sendEnter = _config.AutoSendEnter;
        var payload = text;
        var matchedPrefix = false;

        if (TryStripPrefix(text, new[] { "입력 ", "/입력 ", "send ", "/send ", "vsc " }, out var sendPayload))
        {
            sendEnter = true;
            payload = sendPayload;
            matchedPrefix = true;
        }
        else if (TryStripPrefix(text, new[] { "붙여넣기 ", "/붙여넣기 ", "paste ", "/paste " }, out var pastePayload))
        {
            sendEnter = false;
            payload = pastePayload;
            matchedPrefix = true;
        }

        if (_config.RequirePrefix && !matchedPrefix)
        {
            return;
        }

        if (VsCodeBridge.TrySendLine(_config, payload, sendEnter, out var detail))
        {
            BridgeLog.Write($"forward ok: {detail}");
            var brief = payload.Length > 80 ? $"{payload[..80]}..." : payload;
            var statusText = sendEnter
                ? $"VSCode 입력 전송 시도 완료: {brief}"
                : $"VSCode 붙여넣기 시도 완료: {brief}";
            await SafeSendStatusAsync(statusText).ConfigureAwait(false);
            return;
        }

        BridgeLog.Write($"forward fail: {detail}");
        await SafeSendStatusAsync($"VSCode 전달 실패: {detail}").ConfigureAwait(false);
    }

    private void ReloadConfigIfChanged()
    {
        var stamp = File.GetLastWriteTimeUtc(_configPath);
        if (stamp == _configStampUtc)
        {
            return;
        }

        _config = BridgeConfig.Load(_configPath);
        _configStampUtc = stamp;
        BridgeLog.Write($"config reloaded: title={_config.WinTitle}, click={_config.UseClickFocus}:{_config.FocusClickX},{_config.FocusClickY}, clickHotkeyFallback={_config.AllowHotkeyFallbackWhenClickFocus}");
    }

    private async Task SafeSendStatusAsync(string text)
    {
        try
        {
            await SendMessageAsync(text).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            BridgeLog.Write($"sendMessage error: {ex.Message}");
        }
    }

    private async Task SendMessageAsync(string text)
    {
        using var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["chat_id"] = _config.ChatId,
            ["text"] = text
        });

        var url = BuildApiUrl("sendMessage");
        using var response = await _http.PostAsync(url, form).ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
    }

    private string BuildApiUrl(string method, string? query = null)
    {
        var url = $"https://api.telegram.org/bot{_config.TelegramToken}/{method}";
        return string.IsNullOrWhiteSpace(query) ? url : $"{url}?{query}";
    }

    private static bool Matches(string text, params string[] candidates)
    {
        return candidates.Any(x => string.Equals(text, x, StringComparison.OrdinalIgnoreCase));
    }

    private static bool TryStripPrefix(string text, IEnumerable<string> prefixes, out string payload)
    {
        foreach (var prefix in prefixes)
        {
            if (!text.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            payload = text[prefix.Length..].Trim();
            return !string.IsNullOrWhiteSpace(payload);
        }

        payload = string.Empty;
        return false;
    }
}

internal sealed class BridgeConfig
{
    public string ConfigPath { get; init; } = string.Empty;
    public string TelegramToken { get; init; } = string.Empty;
    public string ChatId { get; set; } = string.Empty;
    public int CheckIntervalMs { get; init; }
    public bool AutoBindChatId { get; init; }
    public string WinTitle { get; init; } = "미니게임지옥 - Visual Studio Code";
    public string FocusHotkey { get; init; } = "^+i";
    public bool AutoSendEnter { get; init; }
    public bool RequirePrefix { get; init; }
    public bool UseClickFocus { get; set; }
    public bool AllowHotkeyFallbackWhenClickFocus { get; init; }
    public int FocusClickX { get; init; }
    public int FocusClickY { get; init; }
    public long PinnedWindowHandle { get; init; }
    public int PinnedWindowProcessId { get; init; }
    public string PinnedWindowTitle { get; init; } = string.Empty;

    public bool HasPinnedWindow => PinnedWindowHandle != 0 || PinnedWindowProcessId != 0;

    public static BridgeConfig Load(string configPath)
    {
        return new BridgeConfig
        {
            ConfigPath = configPath,
            TelegramToken = IniFile.Read(configPath, "Telegram", "Token", string.Empty),
            ChatId = IniFile.Read(configPath, "Telegram", "ChatID", string.Empty),
            CheckIntervalMs = IniFile.ReadInt(configPath, "Telegram", "CheckIntervalMs", 1500),
            AutoBindChatId = IniFile.ReadInt(configPath, "Telegram", "AutoBindChatID", 1) != 0,
            WinTitle = IniFile.Read(configPath, "VSCode", "WinTitle", "미니게임지옥 - Visual Studio Code"),
            FocusHotkey = IniFile.Read(configPath, "VSCode", "FocusHotkey", "^+i"),
            AutoSendEnter = IniFile.ReadInt(configPath, "VSCode", "AutoSendEnter", 1) != 0,
            RequirePrefix = IniFile.ReadInt(configPath, "VSCode", "RequirePrefix", 0) != 0,
            UseClickFocus = IniFile.ReadInt(configPath, "VSCode", "UseClickFocus", 1) != 0,
            AllowHotkeyFallbackWhenClickFocus = IniFile.ReadInt(configPath, "VSCode", "AllowHotkeyFallbackWhenClickFocus", 0) != 0,
            FocusClickX = IniFile.ReadInt(configPath, "VSCode", "FocusClickX", 141),
            FocusClickY = IniFile.ReadInt(configPath, "VSCode", "FocusClickY", 670),
            PinnedWindowHandle = IniFile.ReadLong(configPath, "VSCode", "PinnedWindowHandle", 0),
            PinnedWindowProcessId = IniFile.ReadInt(configPath, "VSCode", "PinnedWindowProcessId", 0),
            PinnedWindowTitle = IniFile.Read(configPath, "VSCode", "PinnedWindowTitle", string.Empty)
        };
    }

    public static string ResolveConfigPath(string startDir)
    {
        var current = new DirectoryInfo(startDir);
        while (current is not null)
        {
            var candidate = Path.Combine(current.FullName, "tele_config.ini");
            if (File.Exists(candidate))
            {
                return candidate;
            }

            current = current.Parent;
        }

        throw new FileNotFoundException("tele_config.ini not found.");
    }

    public static void SaveClickPoint(string configPath, int x, int y)
    {
        IniFile.Write(configPath, "VSCode", "UseClickFocus", "1");
        IniFile.Write(configPath, "VSCode", "FocusClickX", x.ToString());
        IniFile.Write(configPath, "VSCode", "FocusClickY", y.ToString());
    }

    public static void SaveClickMode(string configPath, bool enabled)
    {
        IniFile.Write(configPath, "VSCode", "UseClickFocus", enabled ? "1" : "0");
    }

    public static void SavePinnedWindow(string configPath, IntPtr hwnd, int processId, string title)
    {
        IniFile.Write(configPath, "VSCode", "PinnedWindowHandle", hwnd.ToInt64().ToString());
        IniFile.Write(configPath, "VSCode", "PinnedWindowProcessId", processId.ToString());
        IniFile.Write(configPath, "VSCode", "PinnedWindowTitle", title);
    }

    public static void ClearPinnedWindow(string configPath)
    {
        IniFile.Write(configPath, "VSCode", "PinnedWindowHandle", "0");
        IniFile.Write(configPath, "VSCode", "PinnedWindowProcessId", "0");
        IniFile.Write(configPath, "VSCode", "PinnedWindowTitle", string.Empty);
    }

    public static void SaveChatId(string configPath, string chatId)
    {
        IniFile.Write(configPath, "Telegram", "ChatID", chatId);
    }
}

internal static class VsCodeBridge
{
    private const ushort VkReturn = 0x000D;
    private const ushort VkControl = 0x0011;
    private const ushort VkV = 0x0056;
    private const ushort VkMenu = 0x0012;

    public static bool TrySendLine(BridgeConfig config, string text, bool sendEnter, out string message)
    {
        message = string.Empty;
        var unicodeError = string.Empty;
        var clipError = string.Empty;
        var pasteError = string.Empty;
        var focusAttempts = new List<string>();
        var focusErrors = new List<string>();

        if (string.IsNullOrWhiteSpace(text))
        {
            message = "빈 텍스트";
            return false;
        }

        if (!TryResolveVsCodeWindow(config, out var target, out var title, out var targetDetail))
        {
            message = $"대상 창 없음: {targetDetail}";
            return false;
        }

        if (!TryFocusWindow(target))
        {
            message = "VS Code 포커스 실패";
            return false;
        }

        var focusedByClick = false;
        if (config.UseClickFocus)
        {
            if (TryClickFocusPoint(target, config.FocusClickX, config.FocusClickY, out var clickError))
            {
                focusAttempts.Add($"click({config.FocusClickX},{config.FocusClickY})");
                focusedByClick = true;
                Thread.Sleep(120);
            }
            else
            {
                focusErrors.Add(clickError);
                if (!config.AllowHotkeyFallbackWhenClickFocus)
                {
                    message = $"클릭 포커스 실패: {clickError}";
                    return false;
                }
            }
        }

        var allowHotkeyFallback = !config.UseClickFocus || config.AllowHotkeyFallbackWhenClickFocus;
        if (allowHotkeyFallback && !focusedByClick && !string.IsNullOrWhiteSpace(config.FocusHotkey) && config.FocusHotkey != "-")
        {
            if (TrySendKeysRaw(config.FocusHotkey, 100, out var hotkeyDetail))
            {
                focusAttempts.Add($"hotkey({config.FocusHotkey}:{hotkeyDetail})");
                Thread.Sleep(90);
            }
            else
            {
                focusErrors.Add($"focusHotkey fail: {hotkeyDetail}");
            }
        }

        if (focusAttempts.Count == 0 && focusErrors.Count > 0)
        {
            message = $"포커스 실패: {string.Join(" / ", focusErrors)}";
            return false;
        }

        if (TrySendUnicodeText(text, out unicodeError))
        {
            if (!sendEnter || SendEnter(out var unicodeEnterError))
            {
                var focusMode = focusAttempts.Count > 0 ? $" [{string.Join(" + ", focusAttempts)}]" : string.Empty;
                message = $"유니코드 전달 성공{focusMode}: {title}";
                return true;
            }

            unicodeError = $"text ok, enter fail: {unicodeEnterError}";
        }

        if (TrySetClipboardText(text, out clipError) && SendCtrlV(out pasteError))
        {
            if (!sendEnter || SendEnter(out var clipEnterError) || TrySendKeysRaw("{ENTER}", 80, out clipEnterError))
            {
                var focusMode = focusAttempts.Count > 0 ? $" [{string.Join(" + ", focusAttempts)}]" : string.Empty;
                message = $"클립보드 전달 성공{focusMode}: {title}";
                return true;
            }

            pasteError = $"paste ok, enter fail: {clipEnterError}";
        }

        var focusDetail = focusErrors.Count > 0 ? $"focus={string.Join(" / ", focusErrors)}, " : string.Empty;
        message = $"전달 실패: {focusDetail}unicode={unicodeError}, clip={clipError}, paste={pasteError}";
        return false;
    }

    public static bool TryResolveVsCodeWindow(BridgeConfig config, out IntPtr hwnd, out string title, out string detail)
    {
        if (config.HasPinnedWindow)
        {
            if (TryGetPinnedVsCodeWindow(config, out hwnd, out title))
            {
                detail = "pinned";
                return true;
            }

            hwnd = IntPtr.Zero;
            title = string.Empty;
            detail = $"바인딩된 창 없음 pid={config.PinnedWindowProcessId} hwnd={config.PinnedWindowHandle}";
            return false;
        }

        if (TryGetVsCodeWindow(config.WinTitle, out hwnd, out title))
        {
            detail = "search";
            return true;
        }

        detail = config.WinTitle;
        return false;
    }

    public static bool TryBindForegroundVsCodeWindow(BridgeConfig config, out string message)
    {
        message = string.Empty;
        var foreground = Win32Native.GetForegroundWindow();
        if (!IsVsCodeWindow(foreground, config.WinTitle, out var title))
        {
            message = "현재 활성 창이 VS Code가 아닙니다.";
            return false;
        }

        Win32Native.GetWindowThreadProcessId(foreground, out var processId);
        if (processId == 0)
        {
            message = "VS Code 프로세스 ID를 가져오지 못했습니다.";
            return false;
        }

        BridgeConfig.SavePinnedWindow(config.ConfigPath, foreground, (int)processId, title);
        message = $"pid={(int)processId}, title={NormalizeWindowTitle(title)}";
        return true;
    }

    public static bool TryGetVsCodeWindow(string preferredTitle, out IntPtr hwnd, out string title)
    {
        var foreground = Win32Native.GetForegroundWindow();
        if (IsVsCodeWindow(foreground, preferredTitle, out var foregroundTitle))
        {
            hwnd = foreground;
            title = string.IsNullOrWhiteSpace(foregroundTitle) ? "(작업 영역)" : foregroundTitle;
            return true;
        }

        var exact = IntPtr.Zero;
        var contains = IntPtr.Zero;
        var fallback = IntPtr.Zero;
        var processFallback = IntPtr.Zero;
        var exactTitle = string.Empty;
        var containsTitle = string.Empty;
        var fallbackTitle = string.Empty;
        var processFallbackTitle = string.Empty;

        Win32Native.EnumWindows((handle, _) =>
        {
            if (!Win32Native.IsWindowVisible(handle))
            {
                return true;
            }

            var currentTitle = Win32Native.GetWindowText(handle);
            if (!string.IsNullOrWhiteSpace(currentTitle) &&
                string.Equals(currentTitle, preferredTitle, StringComparison.OrdinalIgnoreCase))
            {
                exact = handle;
                exactTitle = currentTitle;
                return false;
            }

            if (!string.IsNullOrWhiteSpace(preferredTitle) &&
                !string.IsNullOrWhiteSpace(currentTitle) &&
                currentTitle.Contains(preferredTitle, StringComparison.OrdinalIgnoreCase))
            {
                contains = handle;
                containsTitle = currentTitle;
            }
            else if (!string.IsNullOrWhiteSpace(currentTitle) &&
                     (currentTitle.Contains("Visual Studio Code", StringComparison.OrdinalIgnoreCase) ||
                      currentTitle.Contains("VS Code", StringComparison.OrdinalIgnoreCase)))
            {
                fallback = handle;
                fallbackTitle = currentTitle;
            }
            else if (IsVsCodeProcessWindow(handle))
            {
                processFallback = handle;
                processFallbackTitle = currentTitle;
            }

            return true;
        }, IntPtr.Zero);

        if (exact != IntPtr.Zero)
        {
            hwnd = exact;
            title = exactTitle;
            return true;
        }

        if (contains != IntPtr.Zero)
        {
            hwnd = contains;
            title = containsTitle;
            return true;
        }

        if (fallback != IntPtr.Zero)
        {
            hwnd = fallback;
            title = fallbackTitle;
            return true;
        }

        hwnd = processFallback;
        title = string.IsNullOrWhiteSpace(processFallbackTitle) ? "(작업 영역)" : processFallbackTitle;
        return hwnd != IntPtr.Zero;
    }

    private static bool TryGetPinnedVsCodeWindow(BridgeConfig config, out IntPtr hwnd, out string title)
    {
        title = string.Empty;
        hwnd = IntPtr.Zero;

        if (config.PinnedWindowHandle != 0)
        {
            var handle = new IntPtr(config.PinnedWindowHandle);
            if (IsVsCodeWindow(handle, config.WinTitle, out var pinnedTitle))
            {
                if (config.PinnedWindowProcessId == 0)
                {
                    hwnd = handle;
                    title = NormalizeWindowTitle(pinnedTitle);
                    return true;
                }

                Win32Native.GetWindowThreadProcessId(handle, out var processId);
                if (processId == (uint)config.PinnedWindowProcessId)
                {
                    hwnd = handle;
                    title = NormalizeWindowTitle(pinnedTitle);
                    return true;
                }
            }
        }

        if (config.PinnedWindowProcessId == 0)
        {
            return false;
        }

        var match = IntPtr.Zero;
        var matchTitle = string.Empty;
        Win32Native.EnumWindows((handle, _) =>
        {
            if (!Win32Native.IsWindowVisible(handle))
            {
                return true;
            }

            Win32Native.GetWindowThreadProcessId(handle, out var processId);
            if (processId != (uint)config.PinnedWindowProcessId)
            {
                return true;
            }

            if (!IsVsCodeWindow(handle, config.WinTitle, out var currentTitle))
            {
                return true;
            }

            match = handle;
            matchTitle = currentTitle;
            return false;
        }, IntPtr.Zero);

        if (match == IntPtr.Zero)
        {
            return false;
        }

        hwnd = match;
        title = NormalizeWindowTitle(matchTitle);
        return true;
    }

    private static bool IsVsCodeWindow(IntPtr handle, string preferredTitle, out string title)
    {
        title = string.Empty;
        if (handle == IntPtr.Zero || !Win32Native.IsWindowVisible(handle))
        {
            return false;
        }

        title = Win32Native.GetWindowText(handle);
        if (!string.IsNullOrWhiteSpace(preferredTitle) &&
            !string.IsNullOrWhiteSpace(title) &&
            title.Contains(preferredTitle, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (!string.IsNullOrWhiteSpace(title) &&
            (title.Contains("Visual Studio Code", StringComparison.OrdinalIgnoreCase) ||
             title.Contains("VS Code", StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        return IsVsCodeProcessWindow(handle);
    }

    private static string NormalizeWindowTitle(string title)
    {
        return string.IsNullOrWhiteSpace(title) ? "(작업 영역)" : title;
    }

    private static bool IsVsCodeProcessWindow(IntPtr handle)
    {
        if (handle == IntPtr.Zero)
        {
            return false;
        }

        try
        {
            Win32Native.GetWindowThreadProcessId(handle, out var processId);
            if (processId == 0)
            {
                return false;
            }

            using var process = Process.GetProcessById((int)processId);
            return string.Equals(process.ProcessName, "Code", StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    public static CaptureResult CaptureClickPoint(BridgeConfig config)
    {
        if (!TryResolveVsCodeWindow(config, out var hwnd, out _, out var detail))
        {
            return CaptureResult.Fail($"대상 VS Code 창을 찾지 못했습니다: {detail}");
        }

        if (!TryFocusWindow(hwnd))
        {
            return CaptureResult.Fail("VS Code 활성화 실패");
        }

        BridgeLog.Write("capture armed: click target point within 45s");
        var start = DateTime.UtcNow;
        var previousDown = (Win32Native.GetAsyncKeyState(Win32Native.VK_LBUTTON) & 0x8000) != 0;

        while ((DateTime.UtcNow - start) < TimeSpan.FromSeconds(45))
        {
            Thread.Sleep(20);
            var down = (Win32Native.GetAsyncKeyState(Win32Native.VK_LBUTTON) & 0x8000) != 0;
            if (down && !previousDown)
            {
                if (!Win32Native.GetCursorPos(out var cursor))
                {
                    return CaptureResult.Fail("GetCursorPos failed");
                }

                if (!Win32Native.GetWindowRect(hwnd, out var rect))
                {
                    return CaptureResult.Fail("GetWindowRect failed");
                }

                if (cursor.X >= rect.Left && cursor.X < rect.Right && cursor.Y >= rect.Top && cursor.Y < rect.Bottom)
                {
                    Win32Native.GetWindowThreadProcessId(hwnd, out var processId);
                    BridgeConfig.SavePinnedWindow(config.ConfigPath, hwnd, (int)processId, Win32Native.GetWindowText(hwnd));
                    return CaptureResult.Success(cursor.X - rect.Left, cursor.Y - rect.Top);
                }
            }

            previousDown = down;
        }

        return CaptureResult.Fail("45초 안에 클릭하지 않았습니다.");
    }

    private static bool TryClickFocusPoint(IntPtr target, int x, int y, out string error)
    {
        error = string.Empty;
        if (!Win32Native.GetWindowRect(target, out var rect))
        {
            error = "윈도우 사각형 읽기 실패";
            return false;
        }

        if (x < 0 || y < 0 || x >= rect.Width || y >= rect.Height)
        {
            error = $"저장 좌표 범위 오류: {x},{y}";
            return false;
        }

        Win32Native.GetCursorPos(out var backup);
        try
        {
            var screenX = rect.Left + x;
            var screenY = rect.Top + y;
            if (!Win32Native.SetCursorPos(screenX, screenY))
            {
                error = "마우스 이동 실패";
                return false;
            }

            Thread.Sleep(30);
            Win32Native.mouse_event(Win32Native.MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
            Thread.Sleep(20);
            Win32Native.mouse_event(Win32Native.MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
            return true;
        }
        finally
        {
            _ = Win32Native.SetCursorPos(backup.X, backup.Y);
        }
    }

    private static bool TryFocusWindow(IntPtr target)
    {
        if (target == IntPtr.Zero)
        {
            return false;
        }

        if (Win32Native.IsIconic(target))
        {
            _ = Win32Native.ShowWindow(target, Win32Native.SW_RESTORE);
        }
        else
        {
            _ = Win32Native.ShowWindow(target, Win32Native.SW_SHOW);
        }

        _ = Win32Native.AllowSetForegroundWindow(Win32Native.ASFW_ANY);
        _ = Win32Native.BringWindowToTop(target);

        for (var i = 0; i < 6; i++)
        {
            _ = Win32Native.SetForegroundWindow(target);
            _ = Win32Native.BringWindowToTop(target);
            Thread.Sleep(80);
            if (Win32Native.GetForegroundWindow() == target)
            {
                return true;
            }
        }

        var foreground = Win32Native.GetForegroundWindow();
        var currentThread = Win32Native.GetCurrentThreadId();
        var targetThread = Win32Native.GetWindowThreadProcessId(target, out _);
        var foregroundThread = foreground != IntPtr.Zero
            ? Win32Native.GetWindowThreadProcessId(foreground, out _)
            : 0u;

        var attachedForeground = false;
        var attachedTarget = false;
        try
        {
            if (foregroundThread != 0 && foregroundThread != currentThread)
            {
                attachedForeground = Win32Native.AttachThreadInput(currentThread, foregroundThread, true);
            }

            if (targetThread != 0 && targetThread != currentThread)
            {
                attachedTarget = Win32Native.AttachThreadInput(currentThread, targetThread, true);
            }

            _ = SendAltTap();
            _ = Win32Native.BringWindowToTop(target);
            _ = Win32Native.SetForegroundWindow(target);
            Thread.Sleep(90);
            return Win32Native.GetForegroundWindow() == target;
        }
        finally
        {
            if (attachedTarget)
            {
                _ = Win32Native.AttachThreadInput(currentThread, targetThread, false);
            }

            if (attachedForeground)
            {
                _ = Win32Native.AttachThreadInput(currentThread, foregroundThread, false);
            }
        }
    }

    private static bool TrySendUnicodeText(string text, out string error)
    {
        error = string.Empty;
        var cbSize = Marshal.SizeOf<Win32Native.INPUT>();
        foreach (var ch in text)
        {
            var inputs = new[]
            {
                new Win32Native.INPUT
                {
                    type = Win32Native.INPUT_KEYBOARD,
                    U = new Win32Native.InputUnion
                    {
                        ki = new Win32Native.KEYBDINPUT
                        {
                            wVk = 0,
                            wScan = ch,
                            dwFlags = Win32Native.KEYEVENTF_UNICODE
                        }
                    }
                },
                new Win32Native.INPUT
                {
                    type = Win32Native.INPUT_KEYBOARD,
                    U = new Win32Native.InputUnion
                    {
                        ki = new Win32Native.KEYBDINPUT
                        {
                            wVk = 0,
                            wScan = ch,
                            dwFlags = Win32Native.KEYEVENTF_UNICODE | Win32Native.KEYEVENTF_KEYUP
                        }
                    }
                }
            };

            var sent = Win32Native.SendInput((uint)inputs.Length, inputs, cbSize);
            if (sent != inputs.Length)
            {
                error = $"SendInput={sent}/{inputs.Length} LastError={Marshal.GetLastWin32Error()}";
                return false;
            }
        }

        return true;
    }

    private static bool SendEnter(out string error)
    {
        error = string.Empty;
        var cbSize = Marshal.SizeOf<Win32Native.INPUT>();
        var inputs = new[]
        {
            KeyDown(VkReturn),
            KeyUp(VkReturn)
        };

        var sent = Win32Native.SendInput((uint)inputs.Length, inputs, cbSize);
        if (sent == inputs.Length)
        {
            return true;
        }

        error = $"SendInput={sent}/{inputs.Length} LastError={Marshal.GetLastWin32Error()}";
        return false;
    }

    private static bool SendCtrlV(out string error)
    {
        error = string.Empty;
        var cbSize = Marshal.SizeOf<Win32Native.INPUT>();
        var inputs = new[]
        {
            KeyDown(VkControl),
            KeyDown(VkV),
            KeyUp(VkV),
            KeyUp(VkControl)
        };

        var sent = Win32Native.SendInput((uint)inputs.Length, inputs, cbSize);
        if (sent == inputs.Length)
        {
            return true;
        }

        error = $"SendInput={sent}/{inputs.Length} LastError={Marshal.GetLastWin32Error()}";
        return false;
    }

    private static bool SendAltTap()
    {
        var cbSize = Marshal.SizeOf<Win32Native.INPUT>();
        var inputs = new[]
        {
            KeyDown(VkMenu),
            KeyUp(VkMenu)
        };

        return Win32Native.SendInput((uint)inputs.Length, inputs, cbSize) == inputs.Length;
    }

    private static bool TrySetClipboardText(string text, out string error)
    {
        error = string.Empty;
        Exception? exception = null;
        var done = new ManualResetEventSlim(false);

        var thread = new Thread(() =>
        {
            try
            {
                Clipboard.SetText(text);
            }
            catch (Exception ex)
            {
                exception = ex;
            }
            finally
            {
                done.Set();
            }
        });

        thread.IsBackground = true;
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();

        if (!done.Wait(1500))
        {
            error = "Clipboard timeout";
            return false;
        }

        if (exception is null)
        {
            return true;
        }

        error = exception.Message;
        return false;
    }

    private static bool TrySendKeysRaw(string keys, int waitMs, out string detail)
    {
        detail = string.Empty;
        Exception? exception = null;
        var localDetail = string.Empty;
        var done = new ManualResetEventSlim(false);

        var thread = new Thread(() =>
        {
            try
            {
                SendKeys.SendWait(keys);
                Thread.Sleep(waitMs);
                localDetail = "SendKeys";
            }
            catch (Exception ex)
            {
                exception = ex;
            }
            finally
            {
                done.Set();
            }
        });

        thread.IsBackground = true;
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();

        if (!done.Wait(1500))
        {
            detail = "SendKeys timeout";
            return false;
        }

        if (exception is null)
        {
            detail = localDetail;
            return true;
        }

        detail = exception.Message;
        return false;
    }

    private static Win32Native.INPUT KeyDown(ushort key)
    {
        return new Win32Native.INPUT
        {
            type = Win32Native.INPUT_KEYBOARD,
            U = new Win32Native.InputUnion
            {
                ki = new Win32Native.KEYBDINPUT
                {
                    wVk = key,
                    wScan = 0,
                    dwFlags = 0
                }
            }
        };
    }

    private static Win32Native.INPUT KeyUp(ushort key)
    {
        return new Win32Native.INPUT
        {
            type = Win32Native.INPUT_KEYBOARD,
            U = new Win32Native.InputUnion
            {
                ki = new Win32Native.KEYBDINPUT
                {
                    wVk = key,
                    wScan = 0,
                    dwFlags = Win32Native.KEYEVENTF_KEYUP
                }
            }
        };
    }
}

internal static class IniFile
{
    public static string Read(string path, string section, string key, string fallback)
    {
        if (!File.Exists(path))
        {
            return fallback;
        }

        var currentSection = string.Empty;
        foreach (var rawLine in File.ReadAllLines(path, Encoding.UTF8))
        {
            var line = rawLine.Trim();
            if (string.IsNullOrWhiteSpace(line) || line.StartsWith(";") || line.StartsWith("#"))
            {
                continue;
            }

            if (line.StartsWith("[") && line.EndsWith("]"))
            {
                currentSection = line[1..^1].Trim();
                continue;
            }

            if (!string.Equals(currentSection, section, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var split = line.IndexOf('=');
            if (split <= 0)
            {
                continue;
            }

            var currentKey = line[..split].Trim();
            if (!string.Equals(currentKey, key, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            return line[(split + 1)..].Trim();
        }

        return fallback;
    }

    public static int ReadInt(string path, string section, string key, int fallback)
    {
        var value = Read(path, section, key, fallback.ToString());
        return int.TryParse(value, out var parsed) ? parsed : fallback;
    }

    public static long ReadLong(string path, string section, string key, long fallback)
    {
        var value = Read(path, section, key, fallback.ToString());
        return long.TryParse(value, out var parsed) ? parsed : fallback;
    }

    public static void Write(string path, string section, string key, string value)
    {
        var lines = File.Exists(path)
            ? File.ReadAllLines(path, Encoding.UTF8).ToList()
            : new List<string>();

        var sectionHeader = $"[{section}]";
        var sectionStart = -1;
        var sectionEnd = lines.Count;

        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i].Trim();
            if (!line.StartsWith("[") || !line.EndsWith("]"))
            {
                continue;
            }

            if (sectionStart == -1 && string.Equals(line, sectionHeader, StringComparison.OrdinalIgnoreCase))
            {
                sectionStart = i;
                continue;
            }

            if (sectionStart != -1)
            {
                sectionEnd = i;
                break;
            }
        }

        if (sectionStart == -1)
        {
            if (lines.Count > 0 && !string.IsNullOrWhiteSpace(lines[^1]))
            {
                lines.Add(string.Empty);
            }

            lines.Add(sectionHeader);
            lines.Add($"{key}={value}");
            File.WriteAllLines(path, lines, new UTF8Encoding(false));
            return;
        }

        for (var i = sectionStart + 1; i < sectionEnd; i++)
        {
            var line = lines[i];
            var split = line.IndexOf('=');
            if (split <= 0)
            {
                continue;
            }

            var currentKey = line[..split].Trim();
            if (!string.Equals(currentKey, key, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            lines[i] = $"{key}={value}";
            File.WriteAllLines(path, lines, new UTF8Encoding(false));
            return;
        }

        lines.Insert(sectionEnd, $"{key}={value}");
        File.WriteAllLines(path, lines, new UTF8Encoding(false));
    }
}

internal static class BridgeLog
{
    private static readonly object Sync = new();
    private static readonly string LogDir =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MiniGameTelegramBridge");
    private static readonly string LogPath = Path.Combine(LogDir, "bridge.log");

    public static void Write(string message)
    {
        try
        {
            Directory.CreateDirectory(LogDir);
            lock (Sync)
            {
                File.AppendAllText(LogPath, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff} {message}{Environment.NewLine}", Encoding.UTF8);
            }
        }
        catch
        {
        }
    }
}

internal readonly record struct CaptureResult(bool Ok, int X, int Y, string Message)
{
    public static CaptureResult Success(int x, int y) => new(true, x, y, string.Empty);
    public static CaptureResult Fail(string message) => new(false, 0, 0, message);
}

internal sealed class TelegramGetUpdatesResponse
{
    [JsonPropertyName("ok")]
    public bool Ok { get; init; }

    [JsonPropertyName("result")]
    public List<TelegramUpdate>? Result { get; init; }
}

internal sealed class TelegramUpdate
{
    [JsonPropertyName("update_id")]
    public long UpdateId { get; init; }

    [JsonPropertyName("message")]
    public TelegramMessage? Message { get; init; }
}

internal sealed class TelegramMessage
{
    [JsonPropertyName("text")]
    public string? Text { get; init; }

    [JsonPropertyName("chat")]
    public TelegramChat? Chat { get; init; }
}

internal sealed class TelegramChat
{
    [JsonPropertyName("id")]
    public long Id { get; init; }
}
