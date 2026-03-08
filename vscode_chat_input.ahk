#Requires AutoHotkey v2.0
#SingleInstance Off
SetTitleMatchMode 2

text := (A_Args.Length >= 1) ? A_Args[1] : ""
focusHotkey := (A_Args.Length >= 2) ? A_Args[2] : "^+i"
autoSend := (A_Args.Length >= 3) ? (A_Args[3] != "0") : true
winTitle := (A_Args.Length >= 4) ? A_Args[4] : "Visual Studio Code"

if (text = "") {
    ExitApp
}

targetId := WinExist(winTitle)
if (!targetId) {
    targetId := WinExist("ahk_exe Code.exe")
}
if (!targetId) {
    MsgBox "VSCode 창을 찾지 못했습니다."
    ExitApp
}

WinActivate "ahk_id " targetId
if (!WinWaitActive("ahk_id " targetId, , 2)) {
    MsgBox "VSCode 창 활성화 실패"
    ExitApp
}

if (focusHotkey != "-") {
    Send focusHotkey
    Sleep 120
}

clipSaved := ClipboardAll()
A_Clipboard := text
if (!ClipWait(0.5)) {
    A_Clipboard := clipSaved
    MsgBox "클립보드 복사 실패"
    ExitApp
}

Send "^v"
Sleep 60
if (autoSend) {
    Send "{Enter}"
}

A_Clipboard := clipSaved
ExitApp
