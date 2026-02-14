#NoEnv
#SingleInstance Force
#Persistent
SetBatchLines, -1
SendMode, Input
SetTitleMatchMode, 2
DetectHiddenWindows, On
SetWorkingDir, %A_ScriptDir%

; ------------------------------------------------------------------------------
; [설정] 필요 시 tele_config.ini에서 값 덮어씀
; ------------------------------------------------------------------------------
global Telegram_chatid := "5432510881"
global Telegram_Token := "7377526562:AAEhb8p-mld6b2tMH7TAct2Jhqg8dpP6p20"
global TeleCheckInterval := 1500
global LastUpdateID := 0
global TeleCmdBusy := 0
global UseTele := 1

global VscodeWinTitle := "Visual Studio Code"
global ChatFocusHotkey := "^+i"   ; Codex 채팅 입력 포커스 단축키
global AutoSendEnter := 1         ; 1=붙여넣기 후 Enter까지 전송
global RequirePrefix := 0         ; 1이면 "입력 " 또는 "붙여넣기 "로 시작할 때만 실행

LoadConfig()
StartTeleControl()
SendTele("✅ 텔레통신 시작됨")
AddLog("텔레통신 시작")
return

; ------------------------------------------------------------------------------
; [수동 제어]
; ------------------------------------------------------------------------------
F8::Reload
F9::
    if (UseTele) {
        UseTele := 0
        SetTimer, CheckTeleCommand, Off
        SendTele("⏸ 텔레통신 일시중지")
        AddLog("텔레통신 일시중지")
    } else {
        UseTele := 1
        SetTimer, CheckTeleCommand, %TeleCheckInterval%
        SendTele("▶️ 텔레통신 재개")
        AddLog("텔레통신 재개")
    }
return
F10::ExitApp

; ------------------------------------------------------------------------------
; [초기화] 텔레그램 업데이트 오프셋 동기화
; ------------------------------------------------------------------------------
StartTeleControl() {
    global Telegram_Token, LastUpdateID, TeleCheckInterval

    if (TeleCheckInterval = "" || TeleCheckInterval < 1000)
        TeleCheckInterval := 1500

    URL := "https://api.telegram.org/bot" . Telegram_Token . "/getUpdates?limit=1&offset=-1"
    whr := ""

    try {
        whr := ComObjCreate("WinHttp.WinHttpRequest.5.1")
        whr.Open("GET", URL, false)
        whr.Send()
        if RegExMatch(whr.ResponseText, """update_id"":(\d+)", m)
            LastUpdateID := m1
    } catch e {
        AddLog("텔레 초기화 실패: " . e.Message)
    }

    if (IsObject(whr)) {
        ObjRelease(whr)
        whr := ""
    }
    SetTimer, CheckTeleCommand, Off
    SetTimer, CheckTeleCommand, %TeleCheckInterval%
}

; ------------------------------------------------------------------------------
; [메인 루프] 텔레그램 명령 수신
; ------------------------------------------------------------------------------
CheckTeleCommand:
    global TeleCmdBusy, Telegram_Token, Telegram_chatid, LastUpdateID, UseTele
    if (!UseTele)
        return
    if (TeleCmdBusy)
        return
    TeleCmdBusy := 1

    URL := "https://api.telegram.org/bot" . Telegram_Token . "/getUpdates?offset=" . (LastUpdateID + 1) . "&limit=1&timeout=2"
    whr := ""
    Response := ""
    rawMsg := ""
    cleanMsg := ""

    try {
        whr := ComObjCreate("WinHttp.WinHttpRequest.5.1")
        whr.Open("GET", URL, true)
        whr.Send()
        whr.WaitForResponse(2)
        Response := whr.ResponseText
    } catch e {
        AddLog("수신 오류: " . e.Message)
        goto, CheckTeleCommand_Cleanup
    }

    if (!Response || !InStr(Response, """ok"":true"))
        goto, CheckTeleCommand_Cleanup

    if RegExMatch(Response, """update_id"":(\d+)", matchID) {
        LastUpdateID := matchID1

        ; 개인 채팅(+), 그룹(-) 모두 대응
        RegExMatch(Response, """chat"":\{""id"":(-?\d+)", matchChatID)
        if (matchChatID1 != Telegram_chatid)
            goto, CheckTeleCommand_Cleanup

        RegExMatch(Response, """text"":""(.*?)""", matchText)
        rawMsg := matchText1
        cleanMsg := UnEscapeUnicode(rawMsg)
        cleanMsg := Trim(cleanMsg)

        if (cleanMsg != "") {
            AddLog("수신: " . cleanMsg)
            HandleTeleCommand(cleanMsg)
        }
    }

CheckTeleCommand_Cleanup:
    if (IsObject(whr)) {
        ObjRelease(whr)
        whr := ""
    }
    Response := ""
    rawMsg := ""
    cleanMsg := ""
    TeleCmdBusy := 0
return

; ------------------------------------------------------------------------------
; [명령 처리]
; ------------------------------------------------------------------------------
HandleTeleCommand(cleanMsg) {
    global RequirePrefix, VscodeWinTitle, UseTele, TeleCheckInterval, AutoSendEnter

    if (cleanMsg = "/help" || cleanMsg = "명령어" || cleanMsg = "도움말") {
        SendTele("📜 텔레통신 명령어`n`n입력 <내용> : VSCode 채팅창에 붙여넣고 Enter`n붙여넣기 <내용> : 붙여넣기만`n상태 : 연결 상태 확인`n중지 / 시작 : 수신 루프 제어`n`n(기본값) 접두어 없이 텍스트 보내도 바로 입력됨")
        return
    }

    if (cleanMsg = "상태" || cleanMsg = "/상태") {
        ok := WinExist(VscodeWinTitle) || WinExist("ahk_exe Code.exe")
        status := ok ? "연결 가능" : "VSCode 창 없음"
        SendTele("🟢 텔레통신 동작중`n창 상태: " . status)
        return
    }

    if (cleanMsg = "중지" || cleanMsg = "/중지") {
        global UseTele
        UseTele := 0
        SetTimer, CheckTeleCommand, Off
        SendTele("⏸ 수신 루프 중지")
        return
    }

    if (cleanMsg = "시작" || cleanMsg = "/시작") {
        global UseTele, TeleCheckInterval
        UseTele := 1
        SetTimer, CheckTeleCommand, %TeleCheckInterval%
        SendTele("▶️ 수신 루프 재개")
        return
    }

    sendEnter := AutoSendEnter ? 1 : 0
    payload := cleanMsg

    if RegExMatch(cleanMsg, "i)^(입력|/입력|send|/send)\s+(.+)$", m) {
        sendEnter := 1
        payload := m2
    } else if RegExMatch(cleanMsg, "i)^(붙여넣기|/붙여넣기|paste|/paste)\s+(.+)$", m) {
        sendEnter := 0
        payload := m2
    } else if (RequirePrefix) {
        return
    }

    ok := InputToVSCode(payload, sendEnter)
    if (ok) {
        if (sendEnter)
            SendTele("✅ 전달 완료: VSCode 채팅으로 전송됨")
        else
            SendTele("✅ 전달 완료: VSCode 채팅 입력칸에 붙여넣기만 수행")
    } else {
        SendTele("❌ 전달 실패: VSCode 창 또는 채팅 포커스를 찾지 못함")
    }
}

; ------------------------------------------------------------------------------
; [실행] VSCode 채팅창 입력
; ------------------------------------------------------------------------------
InputToVSCode(text, sendEnter := 1) {
    global VscodeWinTitle, ChatFocusHotkey
    if (text = "")
        return false

    targetId := WinExist(VscodeWinTitle)
    if (!targetId)
        targetId := WinExist("ahk_exe Code.exe")
    if (!targetId)
        return false

    WinActivate, ahk_id %targetId%
    WinWaitActive, ahk_id %targetId%, , 2
    if (ErrorLevel)
        return false

    if (ChatFocusHotkey != "-") {
        SendInput, %ChatFocusHotkey%
        Sleep, 120
    }

    clipSaved := ClipboardAll
    Clipboard :=
    Clipboard := text
    ClipWait, 0.8
    if (ErrorLevel) {
        Clipboard := clipSaved
        return false
    }

    SendInput, ^v
    Sleep, 80
    if (sendEnter)
        SendInput, {Enter}

    Clipboard := clipSaved
    return true
}

; ------------------------------------------------------------------------------
; [전송] 텔레그램 메시지
; ------------------------------------------------------------------------------
SendTele(msg) {
    global Telegram_chatid, Telegram_Token
    static WebRequest := ""

    if (!IsObject(WebRequest)) {
        try {
            WebRequest := ComObjCreate("WinHttp.WinHttpRequest.5.1")
        } catch e {
            AddLog("전송 객체 생성 실패: " . e.Message)
            return
        }
    }

    param := "chat_id=" Telegram_chatid "&text=" msg
    URL := "https://api.telegram.org/bot" . Telegram_Token . "/sendmessage?"

    try {
        WebRequest.Open("POST", URL, true)
        WebRequest.SetRequestHeader("Content-Type", "application/x-www-form-urlencoded")
        WebRequest.Send(param)
    } catch e {
        AddLog("전송 실패: " . e.Message)
        WebRequest := ""
    }
}

; ------------------------------------------------------------------------------
; [설정] tele_config.ini 로드/생성
; ------------------------------------------------------------------------------
LoadConfig() {
    global Telegram_chatid, Telegram_Token, TeleCheckInterval
    global VscodeWinTitle, ChatFocusHotkey, AutoSendEnter, RequirePrefix

    cfg := A_ScriptDir . "\tele_config.ini"
    if (!FileExist(cfg)) {
        IniWrite, %Telegram_chatid%, %cfg%, Telegram, ChatID
        IniWrite, %Telegram_Token%, %cfg%, Telegram, Token
        IniWrite, %TeleCheckInterval%, %cfg%, Telegram, CheckIntervalMs
        IniWrite, %VscodeWinTitle%, %cfg%, VSCode, WinTitle
        IniWrite, %ChatFocusHotkey%, %cfg%, VSCode, FocusHotkey
        IniWrite, %AutoSendEnter%, %cfg%, VSCode, AutoSendEnter
        IniWrite, %RequirePrefix%, %cfg%, VSCode, RequirePrefix
        AddLog("tele_config.ini 생성 완료")
        return
    }

    IniRead, val1, %cfg%, Telegram, ChatID, %Telegram_chatid%
    IniRead, val2, %cfg%, Telegram, Token, %Telegram_Token%
    IniRead, val3, %cfg%, Telegram, CheckIntervalMs, %TeleCheckInterval%
    IniRead, val4, %cfg%, VSCode, WinTitle, %VscodeWinTitle%
    IniRead, val5, %cfg%, VSCode, FocusHotkey, %ChatFocusHotkey%
    IniRead, val6, %cfg%, VSCode, AutoSendEnter, %AutoSendEnter%
    IniRead, val7, %cfg%, VSCode, RequirePrefix, %RequirePrefix%

    Telegram_chatid := val1
    Telegram_Token := val2
    TeleCheckInterval := val3 + 0
    VscodeWinTitle := val4
    ChatFocusHotkey := val5
    AutoSendEnter := val6 + 0
    RequirePrefix := val7 + 0
}

; ------------------------------------------------------------------------------
; [유틸] 텔레그램 escape 문자열 복원
; ------------------------------------------------------------------------------
UnEscapeUnicode(str) {
    if (str = "")
        return ""

    pos := 1
    while (pos := RegExMatch(str, "\\u([0-9a-fA-F]{4})", m, pos)) {
        char := Chr("0x" . m1)
        str := StrReplace(str, m, char)
        pos += 1
    }
    str := StrReplace(str, "\/", "/")
    str := StrReplace(str, "\n", "`n")
    str := StrReplace(str, "\""", """")
    return str
}

AddLog(text) {
    FormatTime, ts,, yyyy-MM-dd HH:mm:ss
    line := "[" . ts . "] " . text
    FileAppend, %line%`r`n, %A_ScriptDir%\텔레통신.log
}
