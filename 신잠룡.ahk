; ==============================================================================
; [잠룡매크로 V34 - 공용 루틴 & 단계별 수정 기능 탑재]
; ==============================================================================
#NoEnv
SetBatchLines, -1       ; 스크립트 실행 속도를 최대로 (필수)
ListLines, Off          ; 라인 로그 기록 중지 (속도 향상)
SetWinDelay, -1         ; 윈도우 이동/변경 딜레이 제거 (가장 중요)
SetControlDelay, -1     ; 컨트롤 변경 딜레이 제거
SetKeyDelay, -1         ; 키 입력 딜레이 제거
SetMouseDelay, -1       ; 마우스 딜레이 제거

#SingleInstance Off
SetWorkingDir %A_ScriptDir%
DetectHiddenWindows, On
SetTitleMatchMode, 2
; [수정] 좌표 기준을 창 내부(Client)로 통일
CoordMode, Mouse, Client
CoordMode, Pixel, Client
CoordMode, ToolTip, Client

; 관리자 권한 확인
if !A_IsAdmin {
    Run *RunAs "%A_ScriptFullPath%"
    ExitApp
}

; 관리자 권한으로 올라온 뒤에 동일 스크립트의 이전 인스턴스를 정리한다.
EnsureSingleInstance()

#Include Gdip_All.ahk
#Include FindText.ahk

; ------------------------------------------------------------------------------
; [부팅 안전장치] 동일 스크립트 중복 실행 방지 (권한 상승 이후 처리)
; ------------------------------------------------------------------------------
EnsureSingleInstance() {
    currentPid := DllCall("GetCurrentProcessId")
    WinGet, idList, List, %A_ScriptFullPath% ahk_class AutoHotkey
    Loop, %idList% {
        hwnd := idList%A_Index%
        if (!hwnd || hwnd = A_ScriptHwnd)
            continue

        WinGet, pid, PID, ahk_id %hwnd%
        if (!pid || pid = currentPid)
            continue

        ; 먼저 정상 종료 시도
        WinClose, ahk_id %hwnd%
        WinWaitClose, ahk_id %hwnd%, , 1

        ; 응답 없으면 강제 종료
        if WinExist("ahk_id " . hwnd) {
            Process, Close, %pid%
            Sleep, 120
        }
    }
}

; ===========================================================================
; [전역변수 & 설정]
; ===========================================================================
global ScriptStartTime := A_TickCount ; 프로그램 켜진 시간 기록

global BaseFolder := "C:\Jamryong"
global MainIni := BaseFolder . "\Config_V30.ini"
global CommonIni := BaseFolder . "\Common_Routine.ini" 
global ClientInis := [BaseFolder . "\Client_1.ini", BaseFolder . "\Client_2.ini", BaseFolder . "\Client_3.ini", BaseFolder . "\Client_4.ini", BaseFolder . "\Client_5.ini", BaseFolder . "\Client_6.ini"]


global Default_LevelUp := "|<레벨업>*78$21.zbz84k90a1D0yMk7X4Qkt7aD/ww3bb0ATttU70C0w3U"
global Default_Restart := "|<재실행>*157$40.zzzzTzzyHtxwt01Dbr04nYyTTyHCHkxs8AtD9rCUnUlnQuH6Hzxs99ND07nYYYzzTsQsHs1y0TtD07nwzYwzzDrznk0y0s"
global Default_Restart .= "|<재실행>*163$39.zYyTTCE0bnvU2nYyTTyKQbVvkEnYwbQu6Q6CPbGlYzzS2IgbU3tmYYzzTsNkbk3w0zYw0TDrwbbztyU"
global Default_Restart .="|<재실행>*163$40.zzzzTzzyHtxwt01Dbr04nYyTTyHCHkxs8AtD9rCUnUlnQuH6Hzxs99ND07nYYYzzTsQsHs1y0TtD07nwzYwzzDrznk0y0s"

global Global_DisconnectImg :="|<앱닫기멈춤>*186$41.0K00M06xg3wkyDDM7tVySTkA3kAwzUM60Ftv0lg1XSq1zM360g00kAAkM1zUkNzk7y70nzUA0A1a30M003Dy0zs06000000C"


; [미니모드 설정값 로드] 없으면 기본값 300x180
IniRead, MiniW, %CommonIni%, MiniMode, Width, 300
IniRead, MiniH, %CommonIni%, MiniMode, Height, 180

global Telegram_chatid := "5432510881"
global Telegram_Token := "7377526562:AAEhb8p-mld6b2tMH7TAct2Jhqg8dpP6p20"

IniRead, ReadID, %MainIni%, Settings, TeleID, %Telegram_chatid%
IniRead, ReadToken, %MainIni%, Settings, TeleToken, %Telegram_Token%
Telegram_chatid := ReadID
Telegram_Token := ReadToken

global Clients := [] 
global MonitorState := [1, 1, 1, 1, 1, 1]
global Monitoring := 0
global LastMemCleanTime := 0
global LastAppRestartTime := [0, 0, 0, 0, 0, 0]
global TeleLoginStep := 0  ; [추가] 0:평소상태, 1:로그인번호대기중
global TeleCheckInterval := 2000
global TeleCmdBusy := 0


global DefaultTitles := ["클라이언트 1", "클라이언트 2", "클라이언트 3", "클라이언트 4", "클라이언트 5", "클라이언트 6"]
global Titles := []


Loop, 6 {
    IniRead, savedTitle, %MainIni%, Settings, Title_%A_Index%, % "NoSave"
    if (savedTitle == "NoSave") {
        Titles[A_Index] := DefaultTitles[A_Index]
    } else {
        Titles[A_Index] := savedTitle
    }
}

global CrashCounts := [0, 0, 0, 0, 0, 0]
global LastMacroTime := [0, 0, 0, 0, 0, 0]
global LastScreenShotTime := 0
global WindowsHidden := false
global CurrentEditIndex := 0
global BtnToggleHwnd := 0
global BtnToggleBitmap := 0
global LastLevelUpTime := [0, 0, 0, 0, 0, 0]
global LastEquipTime := [0, 0, 0, 0, 0, 0]
global LastGlobalCheckTime := 0  ; [수정] 전역 변수로 이동
global DismantleCounts := [0, 0, 0, 0, 0, 0]  ; [추가] 장비분해 횟수 저장 (프로그램 종료 시 초기화)

if !FileExist(BaseFolder)
    FileCreateDir, %BaseFolder%

; [수정된 코드] 프로그램 켜질 때 딱 한 번, 확실하게 켭니다.
global pToken := Gdip_Startup()
if (!pToken) {
    MsgBox, 48, 오류, GDI+ 엔진을 켤 수 없습니다. 프로그램을 종료합니다.
    ExitApp
}

; ==============================================================================
; [GUI 구성]
; ==============================================================================
Menu, FileMenu, Add, 프로그램 재실행 (&R), MenuReload
Menu, FileMenu, Add, 종료 (&X), GuiClose
Menu, MenuBar, Add, 파일(File), :FileMenu

Menu, OptionMenu, Add, 클라이언트 이름 초기화, ResetTitles
Menu, OptionMenu, Add, 텔레그램 설정, OpenTeleSettings
Menu, OptionMenu, Add, 팅김 횟수 초기화, ResetCounts
Menu, OptionMenu, Add, 🛠️ 감시 강제 실행 (테스트), ForceRunMonitor
Menu, OptionMenu, Add, 🖥️ 모니터 전체 이동 (1↔2), SwapMonitorSimple
Menu, MenuBar, Add, 설정(Option), :OptionMenu

; [수정됨] 이미지 관리와 공용이벤트 설정을 별도 메뉴로 분리
Menu, ManagerMenu, Add, 📂 이미지 관리, OpenImageManager
Menu, MenuBar, Add, 이미지관리(Img), :ManagerMenu

Menu, CommonMenu, Add, ⚙️ 공용 이벤트 설정, OpenCommonImgSet
Menu, MenuBar, Add, 공용설정(Common), :CommonMenu

; [리디자인] 메인 UI는 잠룡메인 스타일로 스킨, 기능 변수/핸들명은 기존 유지
Gui, Main:New, +HwndMainHwnd
Gui, Main:Menu, MenuBar
Gui, Main:Color, E7EEF8
Gui, Main:Font, s9, Segoe UI

; 배경 + 헤더
Gui, Main:Add, Progress, x0 y0 w1120 h710 cE7EEF8 BackgroundE7EEF8 Disabled, 100
Gui, Main:Add, Progress, x0 y0 w1120 h72 c183A73 Background183A73 Disabled, 100
Gui, Main:Add, Progress, x0 y50 w1120 h24 c275AA8 Background275AA8 Disabled, 100
Gui, Main:Font, s15 cWhite Bold, Segoe UI
Gui, Main:Add, Text, x22 y14 w500 h30 BackgroundTrans, JAMRYONG CONTROL CENTER
Gui, Main:Font, s9 cE8F1FF Norm, Segoe UI
Gui, Main:Add, Text, x24 y45 w620 h20 BackgroundTrans, Multi-Client Inactive Control and Auto Recovery (신잠룡 Core)

; 좌측 모니터링 카드
Gui, Main:Add, Progress, x14 y86 w694 h300 cD6DFEA BackgroundD6DFEA Disabled, 100
Gui, Main:Add, Progress, x12 y84 w694 h300 cFFFFFF BackgroundFFFFFF Disabled, 100
Gui, Main:Add, Progress, x12 y84 w694 h30 c2F80ED Background2F80ED Disabled, 100
Gui, Main:Font, s10 Bold cWhite, Segoe UI
Gui, Main:Add, Text, x26 y90 w300 h20 BackgroundTrans, 클라이언트 모니터링

Loop, 6 {
    yPos := 120 + (A_Index-1) * 42
    Gui, Main:Font, s10 bold c1D2A40
    Gui, Main:Add, Text, x24 y%yPos% w140 h24 vClientName%A_Index% +Left +0x200, % Titles[A_Index]

    Gui, Main:Font, s9 norm cFF0000
    Gui, Main:Add, Text, x168 y%yPos% w70 h24 vStatus%A_Index% +Center +0x200, ⚫ 대기

    Gui, Main:Font, s9 norm c1E2D4A
    Gui, Main:Add, Checkbox, x242 y%yPos%+2 w70 h22 vChkDismantle%A_Index% gSaveMainSettings, 분해

    Gui, Main:Font, s9 Bold cB00020
    Gui, Main:Add, Text, x316 y%yPos% w36 h24 vCrashCnt%A_Index% +Center +0x200, 0

    Gui, Main:Font, s9 norm c1E2D4A
    Gui, Main:Add, Button, x356 y%yPos% w66 h24 gToggleMonitor vBtnMon%A_Index%, 감시ON
    Gui, Main:Add, Button, x427 y%yPos% w78 h24 gOpenIndividualSetting vBtnSet%A_Index%, 설정
    Gui, Main:Add, Button, x510 y%yPos% w88 h24 gManualSelect vBtnSel%A_Index%, 수동연동

    Gui, Main:Font, s8 norm c5B6C84
    Gui, Main:Add, Text, x604 y%yPos%+3 w95 h20 vActiveMacro%A_Index% +Right +0x200, -

    if (A_Index < 6) {
        lineY := yPos + 28
        Gui, Main:Add, Text, x22 y%lineY% w672 h1 0x10
    }
}

; 윈도우 제어 카드
Gui, Main:Add, Progress, x14 y400 w694 h78 cD6DFEA BackgroundD6DFEA Disabled, 100
Gui, Main:Add, Progress, x12 y398 w694 h78 cFFFFFF BackgroundFFFFFF Disabled, 100
Gui, Main:Add, Progress, x12 y398 w170 h78 c183A73 Background183A73 Disabled, 100
Gui, Main:Font, s10 Bold cWhite, Segoe UI
Gui, Main:Add, Text, x28 y406 w150 h20 BackgroundTrans, WINDOW CONTROL
Gui, Main:Font, s8 cE8F1FF Norm, Segoe UI
Gui, Main:Add, Text, x28 y426 w150 h16 BackgroundTrans, Save / Load / Hide / Scan

Gui, Main:Font, s9 c1E2D4A Norm, Segoe UI
Gui, Main:Add, Button, x190 y420 w95 h30 gSaveWinPos, 위치 저장
Gui, Main:Add, Button, x292 y420 w95 h30 gLoadWinPos, 위치 복구
Gui, Main:Add, Button, x394 y420 w95 h30 gToggleHideShow vBtnToggleWin, 전체 숨기기
Gui, Main:Add, Button, x496 y420 w95 h30 gAutoScan, 전체 재연결
Gui, Main:Add, Button, x598 y420 w80 h30 gToggleMiniMode vBtnMiniMode, 미니 모드
Gui, Main:Add, Button, x682 y420 w22 h30 gOpenMiniSetting, ⚙

; 자동실행 설정 카드
Gui, Main:Add, Progress, x14 y492 w694 h188 cD6DFEA BackgroundD6DFEA Disabled, 100
Gui, Main:Add, Progress, x12 y490 w694 h188 cFFFFFF BackgroundFFFFFF Disabled, 100
Gui, Main:Add, Progress, x12 y490 w694 h30 c00A389 Background00A389 Disabled, 100
Gui, Main:Font, s10 Bold cWhite, Segoe UI
Gui, Main:Add, Text, x26 y496 w280 h20 BackgroundTrans, 감지 및 자동 실행 제어

Gui, Main:Font, s9 norm c1E2D4A, Segoe UI
Gui, Main:Add, Checkbox, x24 y528 vUseTele Checked, 텔레그램 ON
Gui, Main:Add, Text, x136 y530, 멈춤 감지 주기(초):
Gui, Main:Add, Edit, x250 y527 w48 h22 vCheckInterval Number Center, 300

Gui, Main:Add, Checkbox, x24 y556 vUseMacroRepeat gUpdateMacroCheck checked, 매크로 반복사용
Gui, Main:Add, Text, x170 y559 c2F80ED, ◀ 설정에서 세팅

Gui, Main:Add, Checkbox, x24 y584 vUseAppRestart, 앱 정기 재실행
Gui, Main:Add, Text, x170 y586, 실행 주기(분):
Gui, Main:Add, Edit, x260 y583 w48 h22 vAppRestartInterval Number Center, 240

Gui, Main:Add, Checkbox, x24 y612 vUseScriptRestart checked gSaveMainSettings, 매크로 재실행
Gui, Main:Add, Text, x170 y614, 실행 주기(분):
Gui, Main:Add, Edit, x260 y611 w48 h22 vScriptRestartInterval Number Center, 120

Gui, Main:Add, Checkbox, x332 y528 vUseScreenShot checked, 화면 전송
Gui, Main:Add, Text, x430 y530, 주기(분):
Gui, Main:Add, Edit, x486 y527 w48 h22 vScreenShotInterval Number Center, 60
Gui, Main:Add, Button, x540 y526 w48 h24 gManualScreenShot, 전송

; 통합 시작/중지 버튼
Gui, Main:Font, s10 bold
Gui, Main:Add, Picture, x520 y572 w170 h48 vBtnToggle hwndBtnToggleHwnd gToggleGlobalMonitor 0xE
UpdateToggleButton(0)

; 우측 로그 카드
Gui, Main:Add, Progress, x722 y86 w384 h594 cD6DFEA BackgroundD6DFEA Disabled, 100
Gui, Main:Add, Progress, x720 y84 w384 h594 cFFFFFF BackgroundFFFFFF Disabled, 100
Gui, Main:Add, Progress, x720 y84 w384 h30 c2F80ED Background2F80ED Disabled, 100
Gui, Main:Font, s10 Bold cWhite, Segoe UI
Gui, Main:Add, Text, x734 y90 w240 h20 BackgroundTrans, 실시간 로그
Gui, Main:Font, s9 norm c1E2D4A, Segoe UI
Gui, Main:Add, ListBox, x734 y120 w356 h548 vLogBox +HScroll

; 창 표시
IniRead, sX, %MainIni%, Settings, MainX, Center
IniRead, sY, %MainIni%, Settings, MainY, Center
if (sX != "Center" && sY != "Center")
    Gui, Main:Show, x%sX% y%sY% w1120 h700, 잠룡매크로
else
    Gui, Main:Show, w1120 h700 Center, 잠룡매크로


; [기존 코드 위치] Gui, Main:Show 아래
AddLog("프로그램 시작됨.")
StartTeleControl() 
AutoScan()
LoadAllStatus()

; ==================================================================
; [수정] 프로그램 실행 시 무조건 감시 모드 시작 (관제 파일 연동용)
; ==================================================================
AddLog("🚀 자동 실행 모드: 즉시 감시를 시작합니다.")

; 1. 버튼 디자인을 '켜짐(초록색)' 상태로 강제 변경
UpdateToggleButton(1)

; 2. 감시 시작 함수 호출
InvokeLabelNow("StartMonitor")

return ; (auto-execute 섹션 종료)
; ==============================================================================
; [핵심 로직] 모니터링 등 (기존 유지)
; ==============================================================================
ToggleMonitor:
    RegExMatch(A_GuiControl, "\d+", idx)
    MonitorState[idx] := !MonitorState[idx]
    if (MonitorState[idx]) {
        GuiControl, Main:, BtnMon%idx%, 감시 ON
        AddLog(Titles[idx] . " 감시가 켜졌습니다.")
    } else {
        GuiControl, Main:, BtnMon%idx%, 감시 OFF
        AddLog(Titles[idx] . " 감시가 꺼졌습니다.")
    }
return

;
==============================================================================
; [원버튼 통합 제어] 고급 애니메이션 토글
; ==============================================================================
ToggleGlobalMonitor:
    Gui, Main:Default
    
    ; 애니메이션 프레임 (많을수록 부드러움)
    Steps := 12
    
    if (Monitoring) {
        ; [ON -> OFF] 끄기
        InvokeLabelNow("StopMonitor")
        
        Loop, %Steps% {
            ; 1.0 -> 0.0 (점점 빠르게)
            Percent := 1.0 - (A_Index / Steps)
            UpdateToggleButton(Percent)
            Sleep, 10 
        }
        UpdateToggleButton(0) 
        
    } else {
        ; [OFF -> ON] 켜기
        InvokeLabelNow("StartMonitor")
        
        Loop, %Steps% {
            ; 0.0 -> 1.0
            Percent := A_Index / Steps
            UpdateToggleButton(Percent)
            Sleep, 10
        }
        UpdateToggleButton(1) 
    }
return

; [디자인 함수] 프리미엄 다크 & 에메랄드 스타일
UpdateToggleButton(Progress) {
    global MainHwnd, BtnToggleHwnd, BtnToggleBitmap
    W := 160, H := 45
    pBitmap := Gdip_CreateBitmap(W, H)
    G := Gdip_GraphicsFromImage(pBitmap)
    Gdip_SetSmoothingMode(G, 4)

    R := 69 + (0 - 69) * Progress
    G_val := 90 + (200 - 90) * Progress
    B := 100 + (83 - 100) * Progress
    ColorHex := 0xFF000000 | (Round(R) << 16) | (Round(G_val) << 8) | Round(B)
    
    BrushBg := Gdip_BrushCreateSolid(ColorHex)
    Gdip_FillRoundedRectangle(G, BrushBg, 0, 0, W, H, 10)
    Gdip_DeleteBrush(BrushBg)

    if (Progress > 0.5) {
        TextStr := "모니터링중"
        TextColor := "0xFFFFFFFF"
        TextX := 25
    } else {
        TextStr := "START"
        TextColor := "0xFFCFD8DC"
        TextX := 75
    }
    FontName := "Segoe UI"
    
    Gdip_TextToGraphics(G, TextStr, "x" . (TextX+1) . " y14 s12 Bold c44000000 r4", FontName, W, H)
    Gdip_TextToGraphics(G, TextStr, "x" . TextX . " y13 s12 Bold c" . TextColor . " r4", FontName, W, H)

    BrushKnob := Gdip_BrushCreateSolid(0xFFFFFFFF)
    Kw := 55, Kh := 37
    CurrentX := 4 + (W - Kw - 8) * Progress
    
    Gdip_FillRoundedRectangle(G, BrushKnob, CurrentX, (H-Kh)/2, Kw, Kh, 8)
    Gdip_DeleteBrush(BrushKnob)

    hBitmap := Gdip_CreateHBITMAPFromBitmap(pBitmap)
    oldBitmap := SetPictureBitmap(BtnToggleHwnd, hBitmap)
    if (oldBitmap)
        DeleteObject(oldBitmap)
    BtnToggleBitmap := hBitmap
    Gdip_DeleteGraphics(G)
    Gdip_DisposeImage(pBitmap)
}
; ===================================================================
; [수정된 StartMonitor & MonitorRoutine]
; ===================================================================

StartMonitor:
    Gui, Main:Submit, NoHide
    Monitoring := 1
    
    Loop, 6 {
        LastMacroTime[A_Index] := A_TickCount
        DismantleCounts[A_Index] := 0 
        LastEquipTime[A_Index] := 0 
        
        ; [추가] 앱 재실행 타이머 초기화 (시작 시점부터 카운트)
        LastAppRestartTime[A_Index] := A_TickCount
    }
    
    LastScreenShotTime := A_TickCount
    LastGlobalCheckTime := A_TickCount
    
    if (CheckInterval < 1) 
        CheckInterval := 1
    
    PauseMonitorTimer()
            ResumeMonitorTimer()
    AddLog("감시 시작 (멈춤체크: " . CheckInterval . "초 / 매크로: 실시간)")
return

StopMonitor:
    Monitoring := 0
    PauseMonitorTimer()
    AddLog("감시 중지")
return


MonitorRoutine:
Gui, Main:Default
Gui, Main:Submit, NoHide
    if (!Monitoring)
        return

   
        
    ; [1] 정기 화면 전송 (설정된 시간마다)
    if (UseScreenShot) {
        ElapsedShot := A_TickCount - LastScreenShotTime
        ShotIntervalMs := ScreenShotInterval * 60 * 1000
        if (ElapsedShot >= ShotIntervalMs) {
            SendAllCaptures("정기 보고")
            LastScreenShotTime := A_TickCount
        }
    }
    
    ; [2] 정기 점검 시간 계산 (멈춤/연결끊김 확인용)
 ; [2] 정기 점검 시간 계산 (수정됨: 분 -> 초 단위 적용)
    CheckIntervalMs := CheckInterval * 1000
    IsLongTermCheck := (A_TickCount - LastGlobalCheckTime >= CheckIntervalMs)
    EquipImgPath := BaseFolder . "\img\장비분해.png"
    EquipImgExists := FileExist(EquipImgPath)
    IniRead, LvlImg, %CommonIni%, CommonImages, LevelUp_Text, %Default_LevelUp%
    IniRead, LvlClickX, %CommonIni%, CommonImages, LevelUp_ClickX, 0
    IniRead, LvlClickY, %CommonIni%, CommonImages, LevelUp_ClickY, 0
    if (UseAppRestart && AppRestartInterval > 0)
        RestartDelay := AppRestartInterval * 60 * 1000

; ==================================================================
    ; [수정됨] 프로그램 정기 재실행 체크 (설정값 저장 강화)
    ; ==================================================================
    if (UseScriptRestart && ScriptRestartInterval > 0) {
        ; 분 단위를 밀리초로 변환
        ScriptRestartLimit := ScriptRestartInterval * 60 * 1000
        
        ; 시간이 되었는지 확인
        if (A_TickCount - ScriptStartTime >= ScriptRestartLimit) {
            AddLog("⏳ 프로그램 재실행합니다...", "시스템")
            
            ; 1. "다음 실행 때 자동으로 감시 시작해라" 표시
            IniWrite, 1, %MainIni%, Settings, AutoStartMonitor
            
            ; 2. [중요] 현재 체크박스 상태와 시간 설정을 확실히 저장
            IniWrite, 1, %MainIni%, Settings, UseScriptRestart ; 무조건 1(켜짐)로 저장
            GuiControlGet, currentInterval,, ScriptRestartInterval
            IniWrite, %currentInterval%, %MainIni%, Settings, ScriptRestartInterval

            ; 3. 모든 설정 저장 (혹시 모르니 메인 저장 함수 호출)
            SaveMainSettingsImpl()
            
            ; 4. GDI 엔진 종료 후 리로드
            if (pToken)
                Gdip_Shutdown(pToken)
            
            Reload 
            ExitApp
        }
    }
    ; ==================================================================

    
    ; [3] 클라이언트별 루프 시작
    Loop, 6 {
        if (!Monitoring)
            return
        
        idx := A_Index
        
        ; [핵심 최적화] 클라이언트 사이사이에 0.1초 휴식 (CPU 점유율 방어)
        if (idx > 1)
            Sleep, 100 
        
        if (MonitorState[idx] == 0)
            continue
            
        obj := Clients[idx]
        cFile := ClientInis[idx]
        
        if (!obj.ID || !WinExist("ahk_id " . obj.ID))
            continue
        
        WinGetPos, wX, wY, wW, wH, % "ahk_id " . obj.ID
        if (wX < -30000 || wW <= 0) 
            continue
        clientTick := A_TickCount

; ==================================================================
        ; [A] 장비 분해 (즉시 반응형 + 디버깅 로그)
 ; ==================================================================
        GuiControlGet, isChk,, ChkDismantle%idx%
        
        if (isChk) {
            ; 쿨타임 10초 (LastEquipTime이 0이면 무조건 통과)
            if (clientTick - LastEquipTime[idx] > 5000) {
            
                if (EquipImgExists) {
                    ; 좌표계 Screen (WinGetPos와 통일)
                    CoordMode, Pixel, Screen
                    CoordMode, Mouse, Screen
                    ImageSearch, FoundX, FoundY, wX, wY, wX+wW, wY+wH, *70 %EquipImgPath%
                    
                    if (ErrorLevel == 0) {
                        teleInterval := (TeleCheckInterval != "" && TeleCheckInterval != 0) ? TeleCheckInterval : 2000
                        PauseMonitorTimer()
                        SetTimer, CheckTeleCommand, Off
                        ; --- [발견!] ---
                        AddLog("📍 " . obj.Name . " 가방풀 (Screen: " . FoundX . "," . FoundY . ")")
                        
                        if (!Monitoring) {
                            SetTimer, CheckTeleCommand, %teleInterval%
                            CoordMode, Pixel, Client
                            CoordMode, Mouse, Client
                            return
                        }
                        
                        ; 실행은 Client 좌표로
                        CoordMode, Pixel, Client
                        CoordMode, Mouse, Client

                        capturedImage := ""
                        try {
                            capturedImage := ExecuteCommonRoutine("CommonEquipRoutine", obj.ID, obj.Name)
                        } finally {
                            SetTimer, CheckTeleCommand, %teleInterval%
                            if (Monitoring)
                                ResumeMonitorTimer()
                        }

                        DismantleCounts[idx]++
                        CompleteMsg := "✅ " . obj.Name . " 분해 완료 (" . DismantleCounts[idx] . "회)"

                        if (capturedImage && FileExist(capturedImage)) {
                            SendPhoto_Binary(Telegram_Token, Telegram_chatid, capturedImage, CompleteMsg)
                            Sleep, 500
                            FileDelete, %capturedImage%
                        } else {
                            SendTele(CompleteMsg)
                        }
                        
                        ; 성공했으므로 현재 시간 기록 (이제부터 10초 쿨타임 시작)
                        LastEquipTime[idx] := A_TickCount
                    }
                    
                    ; 복구
                    CoordMode, Pixel, Client
                    CoordMode, Mouse, Client
                }
            }
        }

 ; ==================================================================
        ; [B] 상시 감시: 반복 매크로
 ; ==================================================================
        if (UseMacroRepeat) {
            GetClientMacroConfigCached(idx, cFile, activeM, mInterval)
            if (activeM != "None" && activeM != "") {
                if (mInterval > 0) {
                    Elapsed := clientTick - LastMacroTime[idx]
                    TargetInterval := mInterval * 60 * 1000
                    if (Elapsed >= TargetInterval) {
                        if (!Monitoring) return
                        LogMsg := "⏰ " . obj.Name . " [" . activeM . "] 실행."
                        AddLog(LogMsg)
                        SendTele(LogMsg)
                        ExecuteRoutine(cFile, "Macro_" . activeM, obj.ID)
                        LastMacroTime[idx] := A_TickCount
                    }
                }
            }
        }

 ; ==================================================================
        ; [C] 상시 감시: 레벨업
 ; ==================================================================
        if (clientTick - LastLevelUpTime[idx] > 20000) {
            ; 탐색 주기를 20초로 고정해서 과탐색 방지
            LastLevelUpTime[idx] := clientTick
            if (FindText(fX, fY, wX, wY, wX+wW, wY+wH, 0.1, 0.1, LvlImg)) {
                LogMsg := "🎉 " . obj.Name . " 레벨업!"
                SendCapture(obj.ID, LogMsg)
                AddLog(LogMsg)
                Sleep, 250
                PostClick(obj.ID, LvlClickX, LvlClickY)
                Sleep, 250
               PostClick(obj.ID, LvlClickX, LvlClickY)
                Sleep, 250
                PostClick(obj.ID, LvlClickX, LvlClickY)
                LastLevelUpTime[idx] := A_TickCount
            }
        }

; ==================================================================
        ; [D] 정기 감시: 연결 끊김 & 화면 멈춤 
 ; ==================================================================
        isDisconnected := false
        isFrozen := false
        
        if (IsLongTermCheck) {
            ; 1. 연결 끊김 확인 (이미지 서치)
            if (FindText(fX, fY, wX, wY, wX+wW, wY+wH, 0.1, 0.1, Global_DisconnectImg)) {
                isDisconnected := true
                AddLog("🔍 " . obj.Name . " 연결 끊김 발견")
            }
            
            ; 2. 화면 멈춤 확인 (함수 호출 한 방으로 끝!)
            if (!isDisconnected) {
                if (IsScreenFrozen(obj.ID)) {
                    isFrozen := true
                    AddLog("❄️ " . obj.Name . " 화면 멈춤 감지됨")
                }
            }
        }

; ==============================================================
        ; [F] 앱 정기 재실행 
; ==============================================================
        if (UseAppRestart && AppRestartInterval > 0) {
            ; 시간이 됐는지 확인
            if (clientTick - LastAppRestartTime[idx] >= RestartDelay) {
                if (!Monitoring) return
                
                ; ★ 만능 함수 호출! (이유: "정기 재실행")
                ProcessRecovery(idx, "정기 재실행")
                
                ; 작업 후 다음 클라로 넘어감
                continue 
            }
        }
; ===============================================================
        ; [E] 멈춤/팅김 감지 및 복구
        ; ===============================================================
        if (isFrozen || isDisconnected) {
            ; 1. 감시 중인지 확인
            if (!Monitoring) 
                return 
            
            Reason := isDisconnected ? "연결 끊김" : "화면 멈춤"
            
            CrashCounts[idx]++
            GuiControl, Main:, CrashCnt%idx%, % CrashCounts[idx] . "회 팅김"
            
            ; 3. 통합 함수 호출
            ProcessRecovery(idx, Reason . " 복구")
            
            continue
        }

; ======================================================================
; [추가] 서버 점검 감지 & 텔레그램 알림
; ======================================================================
if (CheckImageFile(hwnd, "서버점검.png")) {
    
    ; 1. 로그 출력
    AddLog("🚧 [서버 점검] 화면 발견! 텔레그램 전송 중...", sectionName)

    ; 2. 화면 캡처 (파일명: 현재시간_ServerCheck.png)
    pToken := Gdip_Startup()
    pBitmap := Gdip_BitmapFromHWND(hwnd)
    
    if !FileExist("Capture")
        FileCreateDir, Capture
        
    SaveFile := A_ScriptDir . "\Capture\" . A_Now . "_ServerCheck.png"
    Gdip_SaveBitmapToFile(pBitmap, SaveFile)
    Gdip_DisposeImage(pBitmap)
    Gdip_Shutdown(pToken)

    ; 3. ★ SendPhoto_Binary 함수로 전송
    ; (인자 순서가 [토큰, 챗ID, 파일경로, 메시지] 라고 가정했습니다. 쓰시는 순서에 맞게 넣으세요)
    Msg := "[" . sectionName . "] 서버 점검 중입니다. 매크로를 정지합니다."
    SendPhoto_Binary(TelegramToken, TelegramChatID, SaveFile, Msg)

    ; 4. 매크로 중단 처리
    Monitoring := false
    AddLog("⛔ 서버 점검으로 인해 매크로 중단됨.", sectionName)
    return
}

    } ; [중요] Loop, 6 끝나는 중괄호
    

if (IsLongTermCheck) {
        LastGlobalCheckTime := A_TickCount
        
        if (A_TickCount - LastMemCleanTime > 1800000) {
            
            MemBefore := GetScriptMem() ; (선택사항)
            EmptyMem() 
            MemAfter := GetScriptMem()  ; (선택사항)
              LastMemCleanTime := A_TickCount  ; 시간 갱신
          AddLog("🧹 메모리 정리 완료 (" . MemBefore . "MB -> " . MemAfter . "MB)")
        }
    }
return




ManualScreenShot:
    AddLog("수동 캡처 전송 요청...")
    SendAllCaptures("수동 요청")
return

SendAllCaptures(Reason) {
    pBmps := []
    validCount := 0
    
    ; 각 클라이언트 캡처
    Loop, 6 {
        idx := A_Index
        obj := Clients[idx]
        pBmps[idx] := 0
        if (obj.ID && WinExist("ahk_id " . obj.ID)) {
            pBmp := CaptureWindowBitmap(obj.ID)
            if (pBmp) {
                pBmps[idx] := pBmp
                validCount++
            }
        }
    }
    
    if (validCount == 0) {
        AddLog("전송할 게임이 없습니다.")
        return
    }
    
    gridFile := BaseFolder . "\Grid_" . A_TickCount . ".png"
    
    try {
        CreateGridImage(pBmps, gridFile)
        
        if FileExist(gridFile) {
            SendPhoto_Binary(Telegram_Token, Telegram_chatid, gridFile, Reason)
            AddLog("이미지 전송 완료 (" . validCount . "개 클라이언트)")
        }
    } catch e {
        AddLog("⚠️ 그리드 이미지 생성 실패: " . e.Message)
   } finally {
        ; 개별 비트맵 메모리 해제 (반드시 실행)
        Loop, 6 {
            if (pBmps[A_Index])
                Gdip_DisposeImage(pBmps[A_Index])
        }
 
        ; 임시 파일 삭제
        if FileExist(gridFile)
            FileDelete, %gridFile%
    }
}

SendCapture(hwnd, msg) {
    global Telegram_Token, Telegram_chatid, pToken  ; [수정] 전역 변수 pToken 사용 선언
    
    if (!hwnd || !WinExist("ahk_id " . hwnd))
        return
    

    pBitmap := CaptureWindowBitmap(hwnd)
    
    ; 임시 파일 저장
    FormatTime, TimeString,, yyyyMMdd_HHmmss
    SavePath := A_Temp . "\Capture_" . TimeString . ".jpg"
    Gdip_SaveBitmapToFile(pBitmap, SavePath, 100)
    
    ; 메모리 정리 (중요: 이미지만 지우고 엔진은 끄지 않음)
    Gdip_DisposeImage(pBitmap)
     
    ; 파일이 잘 생겼으면 전송
    if FileExist(SavePath) {
        SendPhoto_Binary(Telegram_Token, Telegram_chatid, SavePath, msg)
        FileDelete, %SavePath% ; 전송 후 삭제
    } else {
        SendTele(msg . " (캡처 실패)")
    }
}


SendPhoto_Binary(token, chat_id, file_path, caption="") {
    if !FileExist(file_path)
        return "File Not Found"

    url := "https://api.telegram.org/bot" . token . "/sendPhoto"
    Boundary := "----AHKBoundary" . A_TickCount . A_Now
    
    FileGetSize, fileSize, %file_path%
    FileRead, fileData, *c %file_path%
    
    Header := "--" . Boundary . "`r`n" 
            . "Content-Disposition: form-data; name=""chat_id""" . "`r`n`r`n" . chat_id . "`r`n"
            . "--" . Boundary . "`r`n" 
            . "Content-Disposition: form-data; name=""caption""" . "`r`n`r`n" . caption . "`r`n"
            . "--" . Boundary . "`r`n" 
            . "Content-Disposition: form-data; name=""photo""; filename=""img.png""" . "`r`n" 
            . "Content-Type: image/png" . "`r`n`r`n"
    
    Footer := "`r`n--" . Boundary . "--`r`n"
    
    ado := ComObjCreate("ADODB.Stream")
    ado.Type := 1
    ado.Open()
    
    try {
        ado.Write(StrBuf(Header, "UTF-8"))
        ado.Write(RawDataToSafeArray(&fileData, fileSize))
        ado.Write(StrBuf(Footer, "UTF-8"))
        ado.Position := 0
        ByteArray := ado.Read()
    } finally {
        ado.Close()
        ado := ""
    }
    
    whr := ComObjCreate("WinHttp.WinHttpRequest.5.1")
    whr.Open("POST", url, true)
    whr.SetRequestHeader("Content-Type", "multipart/form-data; boundary=" . Boundary)
    
    try {
        whr.Send(ByteArray)
        whr.WaitForResponse()
    } catch e {
        AddLog("⚠️ 텔레그램 전송 실패: " . e.Message)
    } finally {
        whr := ""
        ByteArray := ""
        fileData := ""
    }
}


CreateGridImage(pBmps, outputFile) {
    global Titles
    
    ValidItems := []
    baseWidth := 0
    baseHeight := 0
    
    Loop, 6 {
        if (pBmps[A_Index]) {
            if (baseWidth == 0) {
                baseWidth := Gdip_GetImageWidth(pBmps[A_Index])
                baseHeight := Gdip_GetImageHeight(pBmps[A_Index])
            }
            ValidItems.Push({bmp: pBmps[A_Index], name: Titles[A_Index]})
        }
    }
    
    Count := ValidItems.MaxIndex()
    if (Count == 0 || baseWidth == 0)
        return
    
    if (Count == 4) {
        Cols := 2
        Rows := 2
    } else {
        Cols := 1
        Rows := Count
    }
    
    GridW := baseWidth * Cols
    GridH := baseHeight * Rows
    
    pBitmap := 0
    pGraphics := 0
    pBrush := 0
    pBrushBg := 0
    
    try {
        pBitmap := Gdip_CreateBitmap(GridW, GridH)
        if (!pBitmap)
            throw Exception("비트맵 생성 실패")
            
        pGraphics := Gdip_GraphicsFromImage(pBitmap)
        if (!pGraphics)
            throw Exception("그래픽스 생성 실패")
            
        Gdip_SetInterpolationMode(pGraphics, 7)
        
        ; 배경 검은색
        pBrush := Gdip_BrushCreateSolid(0xFF000000)
        Gdip_FillRectangle(pGraphics, pBrush, 0, 0, GridW, GridH)
        Gdip_DeleteBrush(pBrush)
        pBrush := 0
        
        ; 이미지 그리기
        For i, item in ValidItems {
            idx := A_Index - 1
            drawX := Mod(idx, Cols) * baseWidth
            drawY := Floor(idx / Cols) * baseHeight
            
            Gdip_DrawImage(pGraphics, item.bmp, drawX, drawY, baseWidth, baseHeight, 0, 0, baseWidth, baseHeight)
            
            pBrushBg := Gdip_BrushCreateSolid(0xAA000000)
            Gdip_FillRectangle(pGraphics, pBrushBg, drawX, drawY, baseWidth, 40)
            Gdip_DeleteBrush(pBrushBg)
            pBrushBg := 0
            
            Options := "x" . (drawX + 10) . " y" . (drawY + 8) . " s20 Bold cFFFFFFFF"
            Gdip_TextToGraphics(pGraphics, item.name, Options, "Malgun Gothic", baseWidth, 40)
        }
        
        Gdip_SaveBitmapToFile(pBitmap, outputFile)
        
    } catch e {
        AddLog("⚠️ 그리드 이미지 생성 오류: " . e.Message)
    } finally {
        if (pBrushBg)
            Gdip_DeleteBrush(pBrushBg)
        if (pBrush)
            Gdip_DeleteBrush(pBrush)
        if (pGraphics)
            Gdip_DeleteGraphics(pGraphics)
        if (pBitmap)
            Gdip_DisposeImage(pBitmap)
    }
}



StrBuf(str, encoding) {
    len := StrPut(str, encoding) - 1
    VarSetCapacity(buf, len, 0)
    StrPut(str, &buf, len, encoding)
    return RawDataToSafeArray(&buf, len)
}

RawDataToSafeArray(pData, len) {
    pSafeArray := DllCall("oleaut32\SafeArrayCreateVector", "Int", 17, "Int", 0, "Int", len)
    DllCall("oleaut32\SafeArrayAccessData", "Ptr", pSafeArray, "PtrP", pDataArray)
    DllCall("RtlMoveMemory", "Ptr", pDataArray, "Ptr", pData, "Ptr", len)
    DllCall("oleaut32\SafeArrayUnaccessData", "Ptr", pSafeArray)
    return ComObjParameter(0x2011, pSafeArray)
}

SendTele(msg) {

    static WebRequest := ""
    
    ; 처음 실행될 때 딱 한 번만 객체를 생성합니다.
    if (!IsObject(WebRequest)) {
        try {
            WebRequest := ComObjCreate("WinHttp.WinHttpRequest.5.1")
        } catch {
            return ; 생성 실패 시 그냥 무시 (다음 턴에 다시 시도)
        }
    }

    param := "chat_id=" Telegram_chatid "&text=" msg
    URL := "https://api.telegram.org/bot" . Telegram_Token . "/sendmessage?" 
    
    try {
        WebRequest.Open("POST", URL, true) ; 비동기 모드(true) 추천
        WebRequest.SetRequestHeader("Content-Type", "application/x-www-form-urlencoded")
        WebRequest.Send(param)
        

    } catch e {
        ; 혹시 에러 나면 객체 초기화 (다음 번에 새로 만들기 위함)
        WebRequest := ""
    }
}

AddLog(Text, SectionName:="") {
    global MainHwnd
    static MaxLogLines := 1200

    FormatTime, TimeString, , HH:mm:ss
    
    ; 1. 로그 앞머리: [시간] [섹션이름] 내용
    if (SectionName != "")
        FinalText := "[" . TimeString . "] [" . SectionName . "] " . Text
    else
        FinalText := "[" . TimeString . "] " . Text

    ; 2. [구분선 위] 루틴 시작이나 중요한 진입 시 구분선
    if (InStr(Text, "루틴 시작") || InStr(Text, "복구 프로세스")) {
        SepLine := "--------------------------------------------------"
        GuiControl, Main:, LogBox, %SepLine%
    }

    ; 3. 실제 로그 출력
    GuiControl, Main:, LogBox, %FinalText%

    ; 4. [구분선 아래] 성공/실패/중단 시 구분선으로 닫기
    if (InStr(Text, "[성공]") || InStr(Text, "[실패]") || InStr(Text, "중단됨") || InStr(Text, "완료")) {
        SepLine := "--------------------------------------------------"
        GuiControl, Main:, LogBox, %SepLine%
    }

    ; 5. 로그 라인 수 제한 (장시간 실행 시 GUI ListBox 과부하 방지)
    SendMessage, 0x18B, 0, 0, ListBox1, ahk_id %MainHwnd% ; LB_GETCOUNT
    Count := ErrorLevel
    while (Count > MaxLogLines) {
        SendMessage, 0x182, 0, 0, ListBox1, ahk_id %MainHwnd% ; LB_DELETESTRING, index 0
        Count--
    }

    ; 6. 스크롤 자동 내리기
    SendMessage, 0x18B, 0, 0, ListBox1, ahk_id %MainHwnd%
    Count := ErrorLevel
    if (Count > 0)
        SendMessage, 0x197, Count-1, 0, ListBox1, ahk_id %MainHwnd%
}
; ==============================================================================
; [최종 수정] 멈춤 감지 함수 (안전 모드 + 이름 통일)
; 1. 0xc0000005 튕김 해결 (LockBits 제거 -> GetPixel 사용)
; 2. 함수 없음 오류 해결 (이름을 CompareBitmaps_Exact로 통일)
; ==============================================================================
CompareBitmaps_Exact(pBitmap1, pBitmap2) {
    ; 이미지가 없으면 비교 불가
    if (!pBitmap1 || !pBitmap2)
        return false

    ; 1. 32x32 픽셀로 작게 축소 (노이즈/먼지 무시 효과)
    sW := 32, sH := 32
    
    pSmall1 := Gdip_CreateBitmap(sW, sH)
    pSmall2 := Gdip_CreateBitmap(sW, sH)
    
    ; 비트맵 생성 실패 시 안전하게 종료
    if (!pSmall1 || !pSmall2) {
        if (pSmall1) 
            Gdip_DisposeImage(pSmall1)
        if (pSmall2) 
            Gdip_DisposeImage(pSmall2)
        return false
    }

    G1 := Gdip_GraphicsFromImage(pSmall1)
    G2 := Gdip_GraphicsFromImage(pSmall2)
    
    ; 2. 이미지를 부드럽게 뭉개서 그리기 (화면 렌더링 차이 무시)
    Gdip_SetInterpolationMode(G1, 7)
    Gdip_SetInterpolationMode(G2, 7)
    
    Gdip_GetImageDimensions(pBitmap1, w1, h1)
    Gdip_GetImageDimensions(pBitmap2, w2, h2)
    
    Gdip_DrawImage(G1, pBitmap1, 0, 0, sW, sH, 0, 0, w1, h1)
    Gdip_DrawImage(G2, pBitmap2, 0, 0, sW, sH, 0, 0, w2, h2)
    
    ; 3. [안전 모드] 픽셀 하나씩 비교 (절대 튕기지 않음)
    isSame := true
    
    Loop, %sW% {
        x := A_Index - 1
        Loop, %sH% {
            y := A_Index - 1
            
            ; 픽셀 색상 가져오기
            c1 := Gdip_GetPixel(pSmall1, x, y)
            c2 := Gdip_GetPixel(pSmall2, x, y)
            
            ; 색이 다르면 -> 화면이 움직인 것 -> 멈춤 아님
            if (c1 != c2) {
                isSame := false
                break 2 ; 루프 2개 즉시 탈출
            }
        }
    }
    
    ; 4. 메모리 청소 (필수)
    Gdip_DeleteGraphics(G1)
    Gdip_DeleteGraphics(G2)
    Gdip_DisposeImage(pSmall1)
    Gdip_DisposeImage(pSmall2)
    
    return isSame
}
; ==============================================================================
; [개별 설정창 수정됨 - FullRowSelect 제거]
; ==============================================================================
OpenIndividualSetting:
    RegExMatch(A_GuiControl, "\d+", CurrentEditIndex)
    WinGetPos, mX, mY, mW, mH, ahk_id %MainHwnd%
    
    ; 설정창 크기
    sW := 520
    sH := 600
    cX := mX + (mW - sW) / 2
    cY := mY + (mH - sH) / 2
    
    Gui, Set:New, +OwnerMain
    Gui, Set:Color, FFFFFF
    Gui, Set:Font, s10, Malgun Gothic
    tName := Titles[CurrentEditIndex]
    cFile := ClientInis[CurrentEditIndex]
    
    ; --- 1. 필수 복구 루틴 섹션 ---
    Gui, Set:Add, GroupBox, x10 y10 w500 h270, 1. 필수 복구 루틴 (멈춤 감지 시 실행)
    
    ; [수정됨] +FullRowSelect 옵션 제거 (오류 해결)
    Gui, Set:Add, ListView, x20 y30 w480 h130 vRecList gRecListEvent Grid -Multi, No|이름(설명)|X|Y|Delay
    
; 버튼 배치 최적화 (삭제 버튼 추가)
    Gui, Set:Add, Button, x20 y170 w110 h30 gLoadRecFromCommon, 📂공용 불러오기
    Gui, Set:Add, Button, x135 y170 w110 h30 gSaveRecToCommon, 💾공용으로 저장
    Gui, Set:Add, Button, x250 y170 w110 h30 gDeleteRecStep, 🗑️ 단계 삭제 ; 
    Gui, Set:Add, Button, x390 y170 w110 h30 gRecordRecovery cRed, 🔴 새로 녹화
    
; 개별 설정창 버튼들 모여있는 곳 (약 570번 라인 근처)
Gui, Set:Add, Button, x20 y235 w110 h30 gEditStepCoord, 🎯 좌표재설정
Gui, Set:Add, Button, x135 y235 w110 h30 gEditStepName, 🏷️ 이름 변경
Gui, Set:Add, Button, x250 y235 w110 h30 gEditStepDelay, ⏳ 딜레이 수정  
Gui, Set:Add, Button, x390 y235 w110 h30 gTestRecoveryOnly, ▶ 테스트실행

    ; --- 2. 추가 매크로 섹션 ---
    Gui, Set:Add, GroupBox, x10 y290 w500 h240, 2. 반복 매크로 (상시 반복 실행)
    Gui, Set:Add, ListView, x20 y320 w480 h130 vMacroList gMacroListEvent Checked -Multi Grid, 매크로 이름|단계 수|반복 주기(분)
    
    ; 하단 버튼
Gui, Set:Add, Button, x20 y460 w80 h30 gRecordNewMacro, ➕ 신규
Gui, Set:Add, Button, x110 y460 w80 h30 gEditTimeSetting,⚙️시간
Gui, Set:Add, Button, x200 y460 w80 h30 gDeleteMacro, 🗑️ 삭제
    
    ; [추가됨] 이미지 및 이벤트 설정 버튼
Gui, Set:Add, Button, x20 y540 w480 h40 gSaveActiveMacro,✔️설정 저장 및 닫기
    
    RefreshRecListView()  ; 복구 루틴 리스트 로드
    RefreshMacroListView() ; 매크로 리스트 로드
    
    Gui, Set:Show, x%cX% y%cY% w%sW% h%sH%, 설정 - %tName%
return

; [새로 추가] 개별 복구 루틴 단계 삭제 로직
DeleteRecStep:
    DeleteRecStepImpl()
return

DeleteRecStepImpl() {
    global ClientInis, CurrentEditIndex, Titles
    Gui, Set:Default
    Gui, Set:ListView, RecList
    row := LV_GetNext(0, "F")
    if (row == 0) {
        MsgBox, 48, 알림, 삭제할 단계를 선택해주세요.
        return
    }
    LV_GetText(delIdx, row, 1)
    MsgBox, 36, 확인, 정말 [%delIdx%번] 단계를 삭제하시겠습니까?
    IfMsgBox, No
        return

    cFile := ClientInis[CurrentEditIndex]
    IniRead, totalCount, %cFile%, Recovery, Count, 0
    TempData := []
    Loop, %totalCount% {
        if (A_Index == delIdx)
            continue
        IniRead, x, %cFile%, Recovery, Step%A_Index%_X
        IniRead, y, %cFile%, Recovery, Step%A_Index%_Y
        IniRead, d, %cFile%, Recovery, Step%A_Index%_Delay
        IniRead, n, %cFile%, Recovery, Step%A_Index%_Name
        TempData.Push({x:x, y:y, d:d, n:n})
    }
    IniDelete, %cFile%, Recovery
    For i, item in TempData {
        IniWrite, % item.x, %cFile%, Recovery, Step%i%_X
        IniWrite, % item.y, %cFile%, Recovery, Step%i%_Y
        IniWrite, % item.d, %cFile%, Recovery, Step%i%_Delay
        IniWrite, % item.n, %cFile%, Recovery, Step%i%_Name
    }
    IniWrite, % TempData.MaxIndex(), %cFile%, Recovery, Count
    RefreshRecListView()
    AddLog(Titles[CurrentEditIndex] . " 루틴 " . delIdx . "번 단계 삭제됨.")
}


; [추가된 기능] 선택한 단계의 딜레이만 수정
EditStepDelay:
    Gui, Set:Default
    Gui, Set:ListView, RecList
    row := LV_GetNext(0, "F") ; 선택된 줄 찾기
    if (row == 0) {
        MsgBox, 48, 알림, 수정할 단계를 먼저 선택해주세요.
        return
    }
    
    LV_GetText(stepNum, row, 1)    ; 단계 번호
    LV_GetText(stepName, row, 2)   ; 단계 이름
    LV_GetText(oldDelay, row, 5)   ; 기존 딜레이 값
    
    ; 입력창 띄우기
    InputBox, newDelay, 딜레이 수정, [%stepName%]의 대기 시간을 입력하세요.`n(단위: ms / 1000 = 1초), , 300, 180, , , , , %oldDelay%
    
    ; 취소 안 누르고 값을 입력했을 때만 저장
    if (!ErrorLevel && newDelay != "") {
        cFile := ClientInis[CurrentEditIndex]
        IniWrite, %newDelay%, %cFile%, Recovery, Step%stepNum%_Delay
        
        ; 리스트뷰 갱신 및 다시 선택 상태로 만들기
        RefreshRecListView()
        LV_Modify(row, "Select")
        AddLog("📝 [" . stepName . "] 딜레이가 " . newDelay . "ms로 수정되었습니다.")
    }
return


; ==============================================================================
; [새로 추가됨] 이미지 및 이벤트 설정창
; ==============================================================================
OpenImageSetting:
    Gui, ImgSet:New, +OwnerSet
    Gui, ImgSet:Color, FFFFFF
    Gui, ImgSet:Font, s9, Malgun Gothic
    
    cFile := ClientInis[CurrentEditIndex]
    
    ; 저장된 값 불러오기 (없으면 기본값 사용)
    IniRead, valLvl, %cFile%, Images, LevelUp_Text, %Default_LevelUp%
    IniRead, valRst, %cFile%, Images, Restart_Text, %Default_Restart%
    IniRead, valX, %cFile%, Images, LevelUp_ClickX, 0
    IniRead, valY, %cFile%, Images, LevelUp_ClickY, 0
    
    Gui, ImgSet:Add, GroupBox, x10 y10 w480 h180, 레벨업 감지 설정
    Gui, ImgSet:Add, Text, x20 y30, 1) 레벨업 이미지 문자열:
    Gui, ImgSet:Add, Edit, x20 y50 w450 h60 vEditLvlStr, %valLvl%
    
    Gui, ImgSet:Add, Text, x20 y120, 2) 창 닫기 클릭 좌표 (빈 공간):
    Gui, ImgSet:Add, Text, x20 y145, X:
    Gui, ImgSet:Add, Edit, x40 y142 w50 h20 vEditLvlX ReadOnly, %valX%
    Gui, ImgSet:Add, Text, x100 y145, Y:
    Gui, ImgSet:Add, Edit, x120 y142 w50 h20 vEditLvlY ReadOnly, %valY%
    
    ; 좌표 설정 버튼
    Gui, ImgSet:Add, Button, x200 y138 w150 h30 gSetLevelUpCoords, 🎯 좌표 설정 (클릭)
    
    Gui, ImgSet:Add, GroupBox, x10 y200 w480 h120, 재실행/연결끊김 설정
    Gui, ImgSet:Add, Text, x20 y220, 1) 재실행/연결끊김 이미지 문자열:
    Gui, ImgSet:Add, Edit, x20 y240 w450 h60 vEditRstStr, %valRst%
    
    Gui, ImgSet:Add, Button, x20 y340 w460 h40 gSaveImageSettings, 💾 저장 후 닫기
    
    Gui, ImgSet:Show, w500 h400, 이미지 및 이벤트 설정
return

; [좌표 설정 로직]
; [좌표 설정 로직 수정됨]
SetLevelUpCoords:
    idx := CurrentEditIndex
    targetID := Clients[idx].ID
    if (!targetID || !WinExist("ahk_id " . targetID)) {
        MsgBox, 48, 오류, 먼저 메인 화면에서 클라이언트를 연동해주세요.
        return
    }
    
    Gui, ImgSet:Hide
    
    ; [핵심] 게임 창 기준으로 좌표 잡기 모드 진입
    WinActivate, ahk_id %targetID%
    CoordMode, Mouse, Client
    
    MsgBox, 64, 좌표 설정, 레벨업 팝업을 닫기 위해 클릭할 `n[빈 공간]을 클릭하세요.

    Loop {
        MouseGetPos, mX, mY
        ToolTip, [좌표 설정]`n내부좌표: %mX%`, %mY%`n좌클릭하여 확정
        
        if GetKeyState("LButton", "P")
            break
        Sleep, 50
    }
    KeyWait, LButton
    ToolTip
    
    ; 확정된 좌표 가져오기
    MouseGetPos, cX, cY
    
    ; [중요] 다시 원래대로 복구
    CoordMode, Mouse, Screen 
    
    Gui, ImgSet:Show
    GuiControl, ImgSet:, EditLvlX, %cX%
    GuiControl, ImgSet:, EditLvlY, %cY%
    MsgBox, 64, 완료, 좌표가 설정되었습니다.`n(X: %cX%, Y: %cY%)
return

; [저장 로직]
SaveImageSettings:
    Gui, ImgSet:Submit
    cFile := ClientInis[CurrentEditIndex]
    
    IniWrite, %EditLvlStr%, %cFile%, Images, LevelUp_Text
    IniWrite, %EditLvlX%, %cFile%, Images, LevelUp_ClickX
    IniWrite, %EditLvlY%, %cFile%, Images, LevelUp_ClickY
    IniWrite, %EditRstStr%, %cFile%, Images, Restart_Text
    
    MsgBox, 64, 저장 완료, 이미지 및 이벤트 설정이 저장되었습니다.
    Gui, ImgSet:Destroy
return

; ==============================================================================
; [기능] 화면 멈춤 확인 함수 (True: 멈춤 / False: 정상)
; ==============================================================================
IsScreenFrozen(hwnd) {
    pBmp1 := 0
    pBmp2 := 0
    result := false
    
    try {
        pBmp1 := Gdip_BitmapFromHWND(hwnd)
        if (!pBmp1)
            return false
        Sleep, 2000 
        pBmp2 := Gdip_BitmapFromHWND(hwnd)
        if (!pBmp2)
            return false
        if (CompareBitmaps_Exact(pBmp1, pBmp2))
            result := true
    } catch e {
        return false
    } finally {
        if (pBmp1)
            Gdip_DisposeImage(pBmp1)
        if (pBmp2)
            Gdip_DisposeImage(pBmp2)
    }
    return result
}


RefreshMacroListView() {
    Gui, Set:Default
    Gui, Set:ListView, MacroList
    LV_Delete()
    
    ; [중요] 함수 안에서 전역 변수(ClientInis, CurrentEditIndex)를 쓰려면 global 선언 필요
    global ClientInis, CurrentEditIndex
    
    cFile := ClientInis[CurrentEditIndex]
    Added := ","
    
    IniRead, sectionNames, %cFile%
    Loop, Parse, sectionNames, `n
    {
        if (InStr(A_LoopField, "Macro_")) {
            mName := StrReplace(A_LoopField, "Macro_", "")
            if (!InStr(Added, "," . mName . ",")) {
                IniRead, sCount, %cFile%, %A_LoopField%, Count, 0
                IniRead, sInterval, %cFile%, %A_LoopField%, Interval, 60
                LV_Add("", mName, sCount, sInterval)
                Added .= mName . ","
            }
        }
    }
    
    ; 현재 활성화된 매크로 체크 표시
    IniRead, activeM, %cFile%, Settings, ActiveMacro, None
    Loop % LV_GetCount() {
        LV_GetText(n, A_Index, 1)
        if (n == activeM)
            LV_Modify(A_Index, "Check")
    }
    
    LV_ModifyCol(1, 150)
    LV_ModifyCol(2, 80)
    LV_ModifyCol(3, 100)
}

; ------------------------------------------------------------------------------
; [복구 루틴 리스트뷰 관련 함수]
; ------------------------------------------------------------------------------
RefreshRecListView() {
    Gui, Set:Default
    Gui, Set:ListView, RecList
    LV_Delete()
    cFile := ClientInis[CurrentEditIndex]
    IniRead, count, %cFile%, Recovery, Count, 0
    Loop, %count% {
        IniRead, x, %cFile%, Recovery, Step%A_Index%_X, 0
        IniRead, y, %cFile%, Recovery, Step%A_Index%_Y, 0
        IniRead, d, %cFile%, Recovery, Step%A_Index%_Delay, 1000
        IniRead, n, %cFile%, Recovery, Step%A_Index%_Name, % "단계 " . A_Index
        LV_Add("", A_Index, n, x, y, d)
    }
    LV_ModifyCol(1, 40)  ; No
    LV_ModifyCol(2, 250) ; 이름
    LV_ModifyCol(3, 50)  ; X
    LV_ModifyCol(4, 50)  ; Y
    LV_ModifyCol(5, 60)  ; Delay
}

RecListEvent:
    if (A_GuiEvent == "DoubleClick") {
        ; 더블 클릭 시 좌표 수정할지 이름 수정할지 묻거나, 바로 좌표 수정
        Gui, Set:Default
        row := A_EventInfo
        if (row > 0) {
            ; 더블클릭하면 바로 좌표 수정 모드로 진입
            EditStepCoordImpl()
        }
    }
return

; [기능] 선택한 단계의 좌표만 다시 찍기
; [기능] 선택한 단계의 좌표만 다시 찍기 (수정됨)
EditStepCoord:
    EditStepCoordImpl()
return

EditStepCoordImpl() {
    Gui, Set:Default
    Gui, Set:ListView, RecList
    row := LV_GetNext(0, "F")
    if (row == 0) {
        MsgBox, 48, 알림, 단계를 선택해주세요.
        return
    }
    
    LV_GetText(stepNum, row, 1)
    LV_GetText(stepName, row, 2)
    
    targetID := Clients[CurrentEditIndex].ID
    if (!targetID) {
        MsgBox, 48, 오류, 메인 화면에서 연동이 되어있어야 합니다.
        return
    }

    Gui, Set:Hide
    
    ; [핵심] 창 기준 모드 진입
    WinActivate, ahk_id %targetID%
    CoordMode, Mouse, Client
    
    MsgBox, 64, 좌표 수정, [%stepName%] 위치를 다시 클릭하세요.
    
    Loop {
        MouseGetPos, mX, mY
        ToolTip, [좌표 수정]`n내부좌표: %mX%`, %mY%`n좌클릭하여 확정
        if GetKeyState("LButton", "P")
            break
        Sleep, 50
    }
    KeyWait, LButton
    ToolTip
    
    MouseGetPos, cX, cY
    CoordMode, Mouse, Screen ; 복구
    
    ; 저장
    cFile := ClientInis[CurrentEditIndex]
    IniWrite, %cX%, %cFile%, Recovery, Step%stepNum%_X
    IniWrite, %cY%, %cFile%, Recovery, Step%stepNum%_Y
    
    Gui, Set:Show
    RefreshRecListView()
    LV_Modify(row, "Select")
    MsgBox, 64, 완료, 수정되었습니다.`n(X:%cX%, Y:%cY%)
}


; [기능] 선택한 단계의 이름 변경
EditStepName:
    Gui, Set:Default
    Gui, Set:ListView, RecList
    row := LV_GetNext(0, "F")
    if (row == 0) {
        MsgBox, 48, 알림, 단계를 선택해주세요.
        return
    }
    LV_GetText(oldName, row, 2)
    LV_GetText(stepNum, row, 1)
    
    InputBox, newName, 이름 변경, 단계 이름을 입력하세요., , 300, 150, , , , , %oldName%
    if (!ErrorLevel && newName != "") {
        cFile := ClientInis[CurrentEditIndex]
        IniWrite, %newName%, %cFile%, Recovery, Step%stepNum%_Name
        RefreshRecListView()
        LV_Modify(row, "Select")
    }
return

; [기능] 공용 루틴으로 저장
SaveRecToCommon:
    MsgBox, 36, 확인, 현재 클라이언트의 복구 루틴을`n[공용 루틴]으로 덮어쓰시겠습니까?
    IfMsgBox, No
        return
        
    cFile := ClientInis[CurrentEditIndex]
    IniRead, count, %cFile%, Recovery, Count, 0
    if (count == 0) {
        MsgBox, 48, 오류, 저장할 루틴이 없습니다.
        return
    }
    
    IniDelete, %CommonIni%, Recovery
    IniWrite, %count%, %CommonIni%, Recovery, Count
    
    Loop, %count% {
        IniRead, x, %cFile%, Recovery, Step%A_Index%_X
        IniRead, y, %cFile%, Recovery, Step%A_Index%_Y
        IniRead, d, %cFile%, Recovery, Step%A_Index%_Delay
        IniRead, n, %cFile%, Recovery, Step%A_Index%_Name, % "단계 " . A_Index
        
        IniWrite, %x%, %CommonIni%, Recovery, Step%A_Index%_X
        IniWrite, %y%, %CommonIni%, Recovery, Step%A_Index%_Y
        IniWrite, %d%, %CommonIni%, Recovery, Step%A_Index%_Delay
        IniWrite, %n%, %CommonIni%, Recovery, Step%A_Index%_Name
    }
    MsgBox, 64, 완료, 공용 루틴으로 저장되었습니다.
return

; [기능] 공용 루틴 불러오기
LoadRecFromCommon:
    if !FileExist(CommonIni) {
        MsgBox, 48, 오류, 저장된 공용 루틴이 없습니다.
        return
    }
    
    MsgBox, 36, 확인, [공용 루틴]을 불러와서 현재 설정을 덮어쓰시겠습니까?
    IfMsgBox, No
        return
        
    cFile := ClientInis[CurrentEditIndex]
    IniDelete, %cFile%, Recovery
    
    IniRead, count, %CommonIni%, Recovery, Count, 0
    IniWrite, %count%, %cFile%, Recovery, Count
    
    Loop, %count% {
        IniRead, x, %CommonIni%, Recovery, Step%A_Index%_X
        IniRead, y, %CommonIni%, Recovery, Step%A_Index%_Y
        IniRead, d, %CommonIni%, Recovery, Step%A_Index%_Delay
        IniRead, n, %CommonIni%, Recovery, Step%A_Index%_Name
        
        IniWrite, %x%, %cFile%, Recovery, Step%A_Index%_X
        IniWrite, %y%, %cFile%, Recovery, Step%A_Index%_Y
        IniWrite, %d%, %cFile%, Recovery, Step%A_Index%_Delay
        IniWrite, %n%, %cFile%, Recovery, Step%A_Index%_Name
    }
    
    RefreshRecListView()
    LoadAllStatus()
    MsgBox, 64, 완료, 공용 루틴을 불러왔습니다.`n필요한 단계의 좌표만 수정해서 사용하세요!
return


TestRecoveryOnly:
    targetID := Clients[CurrentEditIndex].ID
    if (!targetID) {
        MsgBox, 48, 오류, 메인 화면에서 연동부터 해주세요.
        return
    }
    cFile := ClientInis[CurrentEditIndex]
    ExecuteRoutine(cFile, "Recovery", targetID, 1, true)
    
    MsgBox, 64, 완료, 테스트 완료.
return

AutoScan() {
    Loop, 6 {
        targetTitle := Titles[A_Index]
        WinGet, targetID, ID, %targetTitle%
        
        if (targetID) {
            WinGet, pid, PID, ahk_id %targetID%
            Clients[A_Index] := {ID: targetID, PID: pid, Name: targetTitle}
            
            ; [개선] 연결 상태 표시
            Gui, Main:Font, s8 bold c00AA00
            GuiControl, Main:Font, Status%A_Index%
            GuiControl, Main:, Status%A_Index%, 🟢연결
            GuiControl, Main:+BackgroundFFFFFF, Status%A_Index%
            
        } else {
            Clients[A_Index] := {ID: 0, PID: 0, Name: targetTitle}
            
            ; [개선] 대기 상태 표시
            Gui, Main:Font, s8 norm cFF0000
            GuiControl, Main:Font, Status%A_Index%
            GuiControl, Main:, Status%A_Index%, ⚫대기
            GuiControl, Main:+Background404040, Status%A_Index%
        }
    }
}

SaveMainSettings:
    SaveMainSettingsImpl()
return


LoadAllStatus() {
    Loop, 6 {
        cFile := ClientInis[A_Index]
        IniRead, rCount, %cFile%, Recovery, Count, 0
        hasRecovery := (rCount > 0)
        IniRead, activeM, %cFile%, Settings, ActiveMacro, None

; [추가] 저장된 체크박스 상태 불러오기
        IniRead, dCheck, %MainIni%, Settings, DismantleCheck_%A_Index%, 0
        GuiControl, Main:, ChkDismantle%A_Index%, %dCheck%

        
        if (!hasRecovery) {
            Gui, Main:Font, s9 bold cFF0000
            GuiControl, Main:Font, ActiveMacro%A_Index%
            GuiControl, Main:, ActiveMacro%A_Index%, [복구미설정]
        } else {
            if (activeM == "None") {
                Gui, Main:Font, s9 bold cBlue
                GuiControl, Main:Font, ActiveMacro%A_Index%
                GuiControl, Main:, ActiveMacro%A_Index%, [복구ON]
            } else {
                Gui, Main:Font, s9 bold cBlue
                GuiControl, Main:Font, ActiveMacro%A_Index%
                GuiControl, Main:, ActiveMacro%A_Index%, [%activeM%]
            }
        }
    }
}



; [수정] clientName 파라미터 추가
ExecuteCommonRoutine(SectionName, hwnd, clientName := "", isTest := false) {
    global CommonIni, Monitoring, BaseFolder
    Critical, On
    
    IniRead, count, %CommonIni%, %SectionName%, Count, 0
    if (count == 0) {
        if (isTest)
            MsgBox, 48, 알림, 저장된 단계가 없습니다.`n먼저 녹화를 진행해주세요.
        Critical, Off
        return ""
    }
    
    ; [수정] 클라이언트 이름 포함
    if (clientName != "")
        AddLog("▶ " . clientName . " [장비 분해] 시작 (총 " . count . "단계)")
    else
      ;  AddLog("▶ [공용] " . SectionName . " 시작 (총 " . count . "단계)")
    
    captureFile := ""
    
    Loop, %count% {
        if (!isTest && !Monitoring) {
            AddLog("⛔ 감시 중지로 루틴 중단")
            Critical, Off
            return ""
        }
        
        IniRead, x, %CommonIni%, %SectionName%, Step%A_Index%_X
        IniRead, y, %CommonIni%, %SectionName%, Step%A_Index%_Y
        IniRead, d, %CommonIni%, %SectionName%, Step%A_Index%_Delay
        IniRead, n, %CommonIni%, %SectionName%, Step%A_Index%_Name
        
        ; [수정] 로그도 간결하게
        AddLog("  └ [" . A_Index . "/" . count . "] " . n)
        
        PostClick(hwnd, x, y)
        Sleep, %d%
        
        ; 5단계 완료 직후 스크린샷
        if (A_Index == 5 && count >= 6) {
            Sleep, 300
            
            FormatTime, timestamp,, yyyyMMdd_HHmmss
            captureFile := BaseFolder . "\Dismantle_" . timestamp . ".png"
            
            if (CaptureWindow(hwnd, captureFile)) {
                AddLog("📸 결과물 캡처 완료")
            } else {
                captureFile := ""
            }
        }
    }

    ; [장비분해 보정] 7단계 종료 후 2초 내 가방칸 문자열이 보이면 7단계를 1회 더 클릭
    if (SectionName = "CommonEquipRoutine" && count >= 7) {
        retryCodeDefault := "|<잔류>*177$33.0007U0AAAw01zbzU0Dwzw01zXrU0Dwyw03zqTU0Tyzw01g3rU0BUAw01zU7U0Dw0w0U"
        IniRead, retryCode, %CommonIni%, CommonImages, EquipExitRetry_Text, %retryCodeDefault%
        if (retryCode = "ERROR" || retryCode = "")
            retryCode := retryCodeDefault

        if (WaitFindCodeInWindow(hwnd, retryCode, 2, rx, ry)) {
            IniRead, step7X, %CommonIni%, %SectionName%, Step7_X
            IniRead, step7Y, %CommonIni%, %SectionName%, Step7_Y
            if (step7X != "" && step7Y != "") {
                logPrefix := (clientName != "" ? clientName . " " : "")
                AddLog("⚠️ " . logPrefix . "가방칸 잔류 감지 -> 7단계 재클릭")
                PostClick(hwnd, step7X, step7Y)
                Sleep, 250
            }
        }
    }
    
    ; [수정] 완료 로그도 클라이언트 이름 포함
    if (clientName != "")
        AddLog("✅ " . clientName . " [장비 분해] 완료")
    else
        AddLog("✅ [공용] 루틴 완료")
    
    Critical, Off
    return captureFile
}


CaptureWindow(hwnd, savePath) {
    pBitmap := CaptureWindowBitmap(hwnd)
    if (!pBitmap)
        return false

    Gdip_SaveBitmapToFile(pBitmap, savePath)
    Gdip_DisposeImage(pBitmap)
    return FileExist(savePath)
}

; ------------------------------------------------------------------------------
; [비활성 캡처] 가려져 있어도 대상 창만 캡처 (PrintWindow 우선)
; ------------------------------------------------------------------------------
CaptureWindowBitmap(hwnd) {
    if (!hwnd || !WinExist("ahk_id " . hwnd))
        return 0

    WinGetPos,,, wW, wH, ahk_id %hwnd%
    if (wW < 2 || wH < 2)
        return 0

    ; 최소화 상태면 먼저 복구
    WinGet, mm, MinMax, ahk_id %hwnd%
    if (mm = -1) {
        WinRestore, ahk_id %hwnd%
        Sleep, 200
        WinGetPos,,, wW, wH, ahk_id %hwnd%
        if (wW < 2 || wH < 2)
            return 0
    }

    hbm := CreateDIBSection(wW, wH)
    hdc := CreateCompatibleDC()
    obm := SelectObject(hdc, hbm)
    ok := 0

    ; 3 = PW_CLIENTONLY(1) + PW_RENDERFULLCONTENT(2)
    ok := PrintWindow(hwnd, hdc, 3)
    if (!ok)
        ok := PrintWindow(hwnd, hdc, 0)

    pBitmap := 0
    if (ok)
        pBitmap := Gdip_CreateBitmapFromHBITMAP(hbm)

    SelectObject(hdc, obm)
    DeleteObject(hbm)
    DeleteDC(hdc)

    ; PrintWindow 실패 시 최후 폴백
    if (!pBitmap)
        pBitmap := Gdip_BitmapFromHWND(hwnd)

    return pBitmap
}


ExecuteRoutine(iniFile, sectionName, hwnd, startStep:=1, isTest:=false) {
    global Monitoring, Telegram_Token, Telegram_chatid, BaseFolder
    
    IniRead, count, %iniFile%, %sectionName%, Count, 0
    AddLog("▶ 루틴 시작 (총 " . count . "단계)", sectionName)
    
    WinGetPos, wX, wY, wW, wH, ahk_id %hwnd%
    termsSkipFromStep := 0
    immediateStepNo := 0
    
    Loop, %count% {
        if (!isTest && !Monitoring) {
            AddLog("⛔ 중단됨.", sectionName)
            return "STOP"
        }

        ; [공통] 서버 점검 체크
        if (CheckImageFile(hwnd, "서버점검.png")) {
            AddLog("🚧 [서버 점검] 발견! 중단합니다.", sectionName)
            return "MAINTENANCE"
        }

        if (A_Index < startStep)
            continue

        if (termsSkipFromStep && A_Index < termsSkipFromStep) {
            AddLog("⏭️ 약관동의 분기: " . A_Index . "단계 건너뜀", sectionName)
            continue
        }

        IniRead, x, %iniFile%, %sectionName%, Step%A_Index%_X, 0
        IniRead, y, %iniFile%, %sectionName%, Step%A_Index%_Y, 0
        IniRead, d, %iniFile%, %sectionName%, Step%A_Index%_Delay, 1000
        IniRead, n, %iniFile%, %sectionName%, Step%A_Index%_Name, % "단계 " . A_Index

        ; ==================================================================
        ; 단계 준비 딜레이 (약관 분기에서 지정된 즉시 단계는 생략)
        ; ==================================================================
        if (immediateStepNo == A_Index) {
            immediateStepNo := 0
            AddLog("⚡ [" . A_Index . "/" . count . "] " . n . " 즉시 실행", sectionName)
        } else {
            AddLog("  └ [" . A_Index . "/" . count . "] " . n . " 준비 중...", sectionName)
            Sleep, %d%
        }

        ; ==================================================================
        ; [2단계 특수 로직] 업데이트 체크 (없으면 통과)
        ; ==================================================================
        if (A_Index == 2) {
            AddLog("👀 2단계 진입 전: 업데이트 확인 중...", sectionName)

            Loop {
                if (!isTest && !Monitoring)
                    return "STOP"
                
                if (CheckImageFile(hwnd, "서버점검.png"))
                    return "MAINTENANCE"

                ; 업데이트 이미지 확인
                if (CheckImageFile(hwnd, "업데이트.png")) {
                    AddLog("📢 업데이트 발견!", sectionName)
                    SendTele("📢 [" . sectionName . "] 업데이트 발견! 처리 시작...")

                    if (CheckImageFile(hwnd, "업데이트확인.png", btnX, btnY)) {
                        realX := btnX - wX
                        realY := btnY - wY
                        AddLog("🖱️ 업데이트 클릭 -> 90초 대기", sectionName)
                        PostClick(hwnd, realX, realY)
                        
                        Sleep, 90000 ; 90초 대기
                        
                        AddLog("⏰ 대기 완료. 상태를 다시 확인합니다.", sectionName)
                        continue ; 다시 확인 루프
                    }
                }
                ; 업데이트 이미지가 없다면 바로 통과
                else {
                    AddLog("✅ 업데이트 없음. 바로 진행", sectionName)
                    SendTele("✅ [" . sectionName . "] 1단계 완료 (업데이트 없음)")
                    break ; Loop 탈출
                }
                
                Sleep, 1000
            }
        }

        ; ==================================================================
        ; [3단계 클릭 직전 특수 로직] 약관동의 분기
        ; - 3단계의 기본 딜레이를 충분히 기다린 뒤 확인
        ; ==================================================================
        if (A_Index == 3 && sectionName = "Recovery") {
            AddLog("👀 3단계 클릭 직전: 약관동의 확인 중...", sectionName)
            if (TryHandleTermsAgreement(hwnd, sectionName, 6, 250)) {
                termsSkipFromStep := 4
                immediateStepNo := 4
                AddLog("⏭️ 약관동의 처리: 3단계 건너뜀 -> 2초 후 4단계 즉시 실행", sectionName)
                Sleep, 2000
                continue
            }
        }

        ; ==================================================================
        ; [실행] 해당 단계 좌표 클릭 + 텔레그램 알림
        ; ==================================================================
        AddLog("🖱️ " . n . " 실행 (클릭)", sectionName)
        SendTele("🖱️ [" . sectionName . "] " . n . " 실행")
        
        PostClick(hwnd, x, y)
    }

    ; ==================================================================
    ; [최종 확인]
    ; ==================================================================
    AddLog("👀 완료. 상태 확인 중...", sectionName)
    Sleep, 3000
    
    if (CheckImageFile(hwnd, "인게임.png")) {
        AddLog("🎉 [성공] 인게임 진입 확인!", sectionName)
        return "SUCCESS"
    }
    if (CheckImageFile(hwnd, "서버점검.png")) {
        AddLog("🚧 [확인] 서버 점검 중입니다.", sectionName)
        return "MAINTENANCE"
    }
    
    AddLog("❌ [실패] 인게임 진입 실패", sectionName)
    return "FAIL"
}

; ===========================================================================
; [통합] 이미지 서치 (강화판: 최소화 감지 + 좌표 재확인)
; ===========================================================================
CheckImageFile(hwnd, fileName, ByRef returnX:=0, ByRef returnY:=0) {
    global BaseFolder
    
    filePath := BaseFolder . "\img\" . fileName
    if (!FileExist(filePath)) {
        return false
    }

    ; [1] 좌표를 검색 직전에 신선하게 가져옵니다.
    WinGetPos, wX, wY, wW, wH, ahk_id %hwnd%
    
    ; [2] 최소화 상태(-32000)인지 확인
    if (wX < -20000 || wW < 50) {
        WinRestore, ahk_id %hwnd%
        Sleep, 500 ; 그려질 시간 대기
        WinGetPos, wX, wY, wW, wH, ahk_id %hwnd% ; 좌표 다시 갱신
    }

    ; [3] 검색 범위 설정
    X1 := wX
    Y1 := wY
    X2 := wX + wW
    Y2 := wY + wH
    
    CoordMode, Pixel, Screen
    
    ; [4] 이미지 서치 실행
    ; *50: 오차범위 (색상이 살짝 달라도 인식)
    ImageSearch, foundX, foundY, X1, Y1, X2, Y2, *70 %filePath%
    
    if (ErrorLevel == 0) {
        returnX := foundX
        returnY := foundY
        return true
    } else {
        return false
    }
}

; ------------------------------------------------------------------------------
; [FindText 보조] 창 영역 코드 탐색
; ------------------------------------------------------------------------------
FindCodeInWindow(hwnd, code, ByRef relX:=0, ByRef relY:=0) {
    relX := 0
    relY := 0
    if (!hwnd || code = "")
        return false

    WinGetPos, wX, wY, wW, wH, ahk_id %hwnd%
    if (wX < -20000 || wW < 50) {
        WinRestore, ahk_id %hwnd%
        Sleep, 300
        WinGetPos, wX, wY, wW, wH, ahk_id %hwnd%
    }
    if (wW < 50 || wH < 50)
        return false

    if (FindText(fX, fY, wX, wY, wX+wW, wY+wH, 0.1, 0.1, code)) {
        relX := fX - wX
        relY := fY - wY
        return true
    }
    return false
}

WaitFindCodeInWindow(hwnd, code, timeoutSec:=20, ByRef relX:=0, ByRef relY:=0) {
    endTick := A_TickCount + (timeoutSec * 1000)
    Loop {
        if (FindCodeInWindow(hwnd, code, relX, relY))
            return true
        if (A_TickCount >= endTick)
            return false
        Sleep, 250
    }
}

WaitFindAndClickCode(hwnd, code, timeoutSec, sectionName, labelName) {
    if (WaitFindCodeInWindow(hwnd, code, timeoutSec, cx, cy)) {
        AddLog("🖱️ " . labelName . " 클릭", sectionName)
        PostClick(hwnd, cx, cy)
        Sleep, 300
        return true
    }
    AddLog("⚠️ " . labelName . " 미검출 (timeout " . timeoutSec . "초)", sectionName)
    return false
}

; ------------------------------------------------------------------------------
; [복구 분기] 약관동의 팝업 처리
; 약관동의 감지 시: 선택 -> 동의확인 -> 구글로그인 -> 섬서8서버
; ------------------------------------------------------------------------------
TryHandleTermsAgreement(hwnd, sectionName:="Recovery", detectTries:=6, retryMs:=250) {
    static CodeTermsOpen := "|<약관동의>*145$30.wwzzDsAQ1Dn4DlDnYTtDnYC93k4C/7sAQ1Dzws0Ds0zzDs0STDU"
    static CodeTermsSelect := "|<약관동의 선택>*159$47.CM0TY4sCEk0z080QFk1wAE0sHU3k9U9wb47bHUHzA0DrbU7TtUTbj0CzzUzDzyQ1z1y0Twzzzrzzzts"
    static CodeAgreeConfirm := "|<동의확인>*163$48.7P3aA6TAaD7rg6MAaPAqA6MCnv7qA6MClX7aA6MQ0D66DyTw7z7yDaTwU366060Q037y060QU"
    static CodeGoogleLogin := "|<구글로그인>*185$39.TtzUTk3z0Q3yD0M1UTk03Ty7y0ztzkk07zjw7y031zU700MDw0sTU"
    static CodeServer8 := "|<섬서8>*195$29.080k0MklUErVX3tz3C6rq7wBxgSsTFMwkyTnxXAzaP7NX067ny0A7000E0U"

    if (detectTries < 1)
        detectTries := 1
    if (retryMs < 1)
        retryMs := 250

    foundOpen := false
    Loop, %detectTries% {
        if (FindCodeInWindow(hwnd, CodeTermsOpen, tx, ty)) {
            foundOpen := true
            break
        }
        if (A_Index < detectTries)
            Sleep, %retryMs%
    }
    if (!foundOpen)
        return false

    AddLog("📌 약관동의 창 감지 -> 전용 분기 시작", sectionName)

    ; wait1 동작: 단계별 대기 후 발견 즉시 클릭
    WaitFindAndClickCode(hwnd, CodeTermsSelect, 30, sectionName, "약관동의 선택")
    WaitFindAndClickCode(hwnd, CodeAgreeConfirm, 30, sectionName, "동의확인")
    WaitFindAndClickCode(hwnd, CodeGoogleLogin, 40, sectionName, "구글로그인")
    if (WaitFindCodeInWindow(hwnd, CodeServer8, 40, sx, sy)) {
        AddLog("🖱️ 섬서8 서버 선택(1차)", sectionName)
        PostClick(hwnd, sx, sy)
        Sleep, 1000
        AddLog("🖱️ 섬서8 서버 선택(2차)", sectionName)
        PostClick(hwnd, sx, sy)
    } else {
        AddLog("⚠️ 섬서8 미검출 (timeout 40초)", sectionName)
    }

    AddLog("✅ 약관동의 분기 처리 완료", sectionName)
    return true
}


PostClick(hwnd, x, y) {
    if (!hwnd)
        return

    sleep, 50
    ControlClick, x%x% y%y%, ahk_id %hwnd%, , Left, 1, NA Pos
}



RecordRecovery:
    StartRecording("Recovery")
return

RecordNewMacro:
    InputBox, newName, 새 매크로, 이름 입력,, 300, 150
    if (ErrorLevel || newName == "")
        return
    StartRecording("Macro_" . newName)
return

StartRecording(SectionName) {
    global ClientInis, CurrentEditIndex, Clients
    cFile := ClientInis[CurrentEditIndex]
    targetID := Clients[CurrentEditIndex].ID
    MasterRecorder(cFile, SectionName, targetID, "Set")
}


MacroListEvent:
    if (A_GuiEvent == "I" && InStr(ErrorLevel, "C", true)) {
        LV_GetText(clickedName, A_EventInfo, 1)
        rowNumber := 0 
        Loop % LV_GetCount() {
            rowNumber := A_Index
            if (rowNumber != A_EventInfo)
                LV_Modify(rowNumber, "-Check")
        }
    }
return

EditTimeSetting:
    Gui, Set:Default
    Gui, Set:ListView, MacroList
    row := LV_GetNext(0, "F")
    if (row == 0) 
        row := LV_GetNext(0, "C")
    if (row == 0) {
        MsgBox, 48, 알림, 선택하세요.
        return
    }
    LV_GetText(mName, row, 1)
    LV_GetText(oldTime, row, 3)
    InputBox, newTime, 시간 설정, [%mName%] 주기(분), , 300, 150, , , , , %oldTime%
    if (!ErrorLevel && newTime != "") {
        LV_Modify(row, "Col3", newTime)
        cFile := ClientInis[CurrentEditIndex]
        IniWrite, %newTime%, %cFile%, Macro_%mName%, Interval
        MsgBox, 64, 완료, 설정되었습니다.
    }
return

SaveActiveMacro:
    Gui, Set:Default
    Gui, Set:ListView, MacroList  ; 매크로 리스트뷰를 바라보게 설정
    
    cFile := ClientInis[CurrentEditIndex]
    
    ; 1. 기본값을 일단 'None' (매크로 끔)으로 설정
    checkedName := "None"
    
    ; 2. 체크된 줄이 있는지 확실하게 확인 (오토핫키 내장 함수 "C" 옵션 사용)
    ; LV_GetNext(0, "C") -> 체크된 줄의 번호를 찾아줍니다. 없으면 0이 나옵니다.
    rowNumber := LV_GetNext(0, "C") 
    
    ; 3. 체크된 줄이 발견되면, 그 이름을 가져옵니다.
    if (rowNumber > 0) {
        LV_GetText(checkedName, rowNumber, 1)
    }
    
    ; 4. 결과 저장 
    ; (체크를 다 풀었다면 위에서 설정한 "None"이 저장되어 매크로가 꺼집니다)
    IniWrite, %checkedName%, %cFile%, Settings, ActiveMacro
    
    MsgBox, 64, 저장, 설정이 정확하게 저장되었습니다.`n(적용: %checkedName%)
    
    ; 5. 메인 화면 갱신 및 창 닫기
    LoadAllStatus()
    Gui, Set:Destroy
return
DeleteMacro:
    DeleteMacroImpl()
return

DeleteMacroImpl() {
    global ClientInis, CurrentEditIndex
    Gui, Set:Default
    Gui, Set:ListView, MacroList
    row := LV_GetNext(0, "F")
    if (row == 0) 
        row := LV_GetNext(0, "C")
    if (row == 0) {
        MsgBox, 48, 알림, 선택하세요.
        return
    }
    LV_GetText(mName, row, 1)
    MsgBox, 36, 확인, 삭제하시겠습니까?
    IfMsgBox, No
        return
    cFile := ClientInis[CurrentEditIndex]
    IniDelete, %cFile%, Macro_%mName%
    IniRead, act, %cFile%, Settings, ActiveMacro
    if (act == mName) {
        IniWrite, None, %cFile%, Settings, ActiveMacro
        LoadAllStatus()
    }
    LV_Delete(row)
}

CloseSettingWindow:
    Gui, Set:Destroy
    LoadAllStatus()
return

OpenTeleSettings:
    Gui, Tele:New, +OwnerMain
    Gui, Tele:Color, FFFFFF
    Gui, Tele:Font, s9, Malgun Gothic
    Gui, Tele:Add, Text, x10 y15, Token:
    Gui, Tele:Add, Edit, x55 y12 w250 h20 vEditToken, %Telegram_Token%
    Gui, Tele:Add, Text, x315 y15, ChatID:
    Gui, Tele:Add, Edit, x365 y12 w100 h20 vEditID, %Telegram_chatid%
    Gui, Tele:Add, Button, x475 y11 w60 h22 gSaveTele, 저장
    Gui, Tele:Show, w550 h50, 텔레그램 설정
return

SaveTele:
    Gui, Tele:Submit
    Telegram_Token := EditToken
    Telegram_chatid := EditID
    IniWrite, %Telegram_Token%, %MainIni%, Settings, TeleToken
    IniWrite, %Telegram_chatid%, %MainIni%, Settings, TeleID
    MsgBox, 64, 완료, 저장되었습니다.
    Gui, Tele:Destroy
return

SaveWinPos:
    SavedCount := 0
    Loop, 6 {
        targetID := Clients[A_Index].ID
        if (targetID && WinExist("ahk_id " . targetID)) {
            WinGetPos, wX, wY, wW, wH, ahk_id %targetID%
            IniWrite, %wX%, %MainIni%, WinPos%A_Index%, X
            IniWrite, %wY%, %MainIni%, WinPos%A_Index%, Y
            IniWrite, %wW%, %MainIni%, WinPos%A_Index%, W
            IniWrite, %wH%, %MainIni%, WinPos%A_Index%, H
            SavedCount++
        }
    }
    if (SavedCount > 0)
        MsgBox, 64, 저장, %SavedCount%개 창 위치 저장 완료.
return

LoadWinPos:
    LoadWinPosImpl()
return

SaveMainSettingsImpl() {
    global MainIni
    Gui, Main:Submit, NoHide
    Loop, 6 {
        IniWrite, % ChkDismantle%A_Index%, %MainIni%, Settings, DismantleCheck_%A_Index%
    }
}

LoadWinPosImpl() {
    global MainIni, Clients
    Loop, 6 {
        targetID := Clients[A_Index].ID
        if (targetID && WinExist("ahk_id " . targetID)) {
            IniRead, wX, %MainIni%, WinPos%A_Index%, X, Error
            if (wX != "Error") {
                IniRead, wY, %MainIni%, WinPos%A_Index%, Y
                IniRead, wW, %MainIni%, WinPos%A_Index%, W
                IniRead, wH, %MainIni%, WinPos%A_Index%, H
                WinMove, ahk_id %targetID%, , %wX%, %wY%, %wW%, %wH%
            }
        }
    }
}

GetClientMacroConfigCached(idx, cFile, ByRef activeM, ByRef mInterval, ttlMs := 5000) {
    static lastRead := [0, 0, 0, 0, 0, 0]
    static activeCache := ["", "", "", "", "", ""]
    static intervalCache := [60, 60, 60, 60, 60, 60]
    nowTick := A_TickCount

    if (idx < 1 || idx > 6) {
        activeM := "None"
        mInterval := 60
        return
    }

    if ((nowTick - lastRead[idx]) >= ttlMs || activeCache[idx] = "") {
        IniRead, readActive, %cFile%, Settings, ActiveMacro, None
        readInterval := 60
        if (readActive != "None" && readActive != "") {
            IniRead, readInterval, %cFile%, Macro_%readActive%, Interval, 60
            if (readInterval = "" || readInterval = "ERROR")
                readInterval := 60
        }
        activeCache[idx] := readActive
        intervalCache[idx] := readInterval
        lastRead[idx] := nowTick
    }

    activeM := activeCache[idx]
    mInterval := intervalCache[idx]
}

ToggleHideShow:
    WindowsHidden := !WindowsHidden
    if (WindowsHidden) 
        GuiControl, Main:, BtnToggleWin, 👁️ 전체 보이기
    else 
        GuiControl, Main:, BtnToggleWin, 👁️ 전체 숨기기
    Loop, 6 {
        targetID := Clients[A_Index].ID
        if (targetID && WinExist("ahk_id " . targetID)) {
            if (WindowsHidden)
                WinMinimize, ahk_id %targetID%
            else
                WinRestore, ahk_id %targetID%
        }
    }
return

AutoScan:
    AutoScan()
return

ManualSelect:
    RegExMatch(A_GuiControl, "\d+", idx)
    
    ToolTip, 2초 내에 기억시킬 게임 창을 클릭하세요!
    KeyWait, LButton, D
    KeyWait, LButton
    MouseGetPos, , , winId
    
    ; 1. 실제 창 제목 가져오기
    WinGetTitle, realTitle, ahk_id %winId%
    WinGet, pid, PID, ahk_id %winId%
    
    if (realTitle == "") {
        MsgBox, 48, 오류, 창 제목을 가져올 수 없습니다. 다시 시도해주세요.
        ToolTip
        return
    }

    ; 2. 내부 변수 갱신
    Clients[idx] := {ID: winId, PID: pid, Name: realTitle}
    
    ; [핵심] 전역 변수 Titles 업데이트 (이제 AutoScan도 이 이름을 씀)
    Titles[idx] := realTitle
    
    ; [핵심] INI 파일에 영구 저장 (껐다 켜도 기억함)
    IniWrite, %realTitle%, %MainIni%, Settings, Title_%idx%
    
    ; 3. 화면 갱신
    GuiControl, Main:, ClientName%idx%, %realTitle%
    Gui, Main:Font, c008000 bold
    GuiControl, Main:Font, Status%idx%
    GuiControl, Main:, Status%idx%, 🟢연결
    
    AddLog(idx . "번 클라이언트가 [" . realTitle . "]로 설정/저장되었습니다.")
    ToolTip
return


MenuReload:
    ; 1. 타이머부터 멈춤 (재실행 중에 매크로 돌면 꼬임)
    PauseMonitorTimer()
    SetTimer, CheckTeleCommand, Off
    
    ; 2. GDI+ 엔진 끄기 (공장 가동 중지)
    if (pToken) {
        Gdip_Shutdown(pToken)
        pToken := 0
    }
    
    ; 3. 현재 위치 저장 (재실행해도 창 위치 기억하게)
    WinGetPos, mX, mY, , , ahk_id %MainHwnd%
    if (mX != "" && mY != "") {
        IniWrite, %mX%, %MainIni%, Settings, MainX
        IniWrite, %mY%, %MainIni%, Settings, MainY
    }
    
    ; 4. 깔끔하게 재실행
    Reload
return


ResetCounts:
    Loop, 6 {
        CrashCounts[A_Index] := 0
        GuiControl, Main:, CrashCnt%A_Index%, 0회
    }
    AddLog("팅김 횟수가 초기화되었습니다.")
return

MsgBox(Text, Options="") {
    MsgBox, %Options%, 알림, %Text%
    IfMsgBox, No
        return "No"
    return "Yes"
}

; ==============================================================================
; [미니 모드 V21] 변수 할당 완벽 수정 + 모니터 선택 + 5클라
; ==============================================================================
ToggleMiniMode:
    IsMiniMode := !IsMiniMode
    
    if (IsMiniMode) {
        ; --- [미니모드 ON] ---
        GuiControl, Main:, BtnMiniMode, 💻 복귀 모드
        
        ; 저장된 모니터 번호 불러오기 (기본값 1)
        IniRead, TargetMon, %CommonIni%, MiniMode, Monitor, 1
        AddLog("미니모드(ON) - " . TargetMon . "번 모니터로 집결")

        ; 선택한 모니터의 작업 영역 좌표를 가져옴
        SysGet, Mon, MonitorWorkArea, %TargetMon%
        ScreenRight := MonRight
        ScreenBottom := MonBottom
        
        ; 1. Alt+G 전송 (작아져라!)
        Loop, 5 {
            idx := A_Index
            obj := Clients[idx]
            TargetID := obj.ID  ; [수정] 변수 할당 먼저!
            
            if (TargetID && WinExist("ahk_id " . TargetID)) {
                WinActivate, ahk_id %TargetID%
                Sleep, 50
                Send, !g 
                Sleep, 50
            }
        }
        
        Sleep, 500
        
        ; 2. 1번 클라 크기 측정
        RefID := Clients[1].ID
        WinGetPos, , , RealW, RealH, ahk_id %RefID%
        
        ; 3. 정렬 이동
        Loop, 5 {
            idx := A_Index
            TargetID := Clients[idx].ID ; [확인] 여기도 변수 할당 되어있음
            
            if (TargetID && WinExist("ahk_id " . TargetID)) {
                NewX := ScreenRight - (RealW * idx)
                NewY := ScreenBottom - RealH
                
                WinMove, ahk_id %TargetID%, , %NewX%, %NewY%
            }
        }
        
    } else {
        ; --- [복귀 모드] ---
        GuiControl, Main:, BtnMiniMode, 📱 미니 모드
        AddLog("일반모드(OFF) - Alt+G & 위치 복구")

        ; 1. Alt+G 복원 (커져라!)
        Loop, 5 {
            idx := A_Index
            obj := Clients[idx]
            TargetID := obj.ID ; [수정] 변수 할당 먼저!
            
            if (TargetID && WinExist("ahk_id " . TargetID)) {
                WinActivate, ahk_id %TargetID%
                Sleep, 50
                Send, !g 
                Sleep, 50
            }
        }
        
        Sleep, 500

        ; 2. 위치 복구 (3회)
        Loop, 3 {
            LoadWinPosImpl()
            Sleep, 200
        }

        ; 3. 잔상 제거
        Loop, 5 {
            TargetID := Clients[A_Index].ID ; [확인] 여기도 변수 할당 되어있음
            if (TargetID)
                WinSet, Redraw, , ahk_id %TargetID%
        }
        AddLog("✅ 복구 완료")
    }
return

; ==============================================================================
; [기능 추가] 감시/복구 강제 실행 (테스트용)
; ==============================================================================
ForceRunMonitor:
    if (!Monitoring) {
        MsgBox, 48, 알림, 먼저 [▶ 감시 시작]을 눌러주세요.`n감시가 켜진 상태에서만 테스트할 수 있습니다.
        return
    }

    AddLog("▶ [강제테스트] 멈춤/끊김 1회 직접 점검 시작")

    hasTarget := false
    hitCount := 0

    Loop, 6 {
        idx := A_Index
        if (MonitorState[idx] == 0)
            continue

        obj := Clients[idx]
        if (!obj.ID || !WinExist("ahk_id " . obj.ID))
            continue

        hasTarget := true
        WinGetPos, wX, wY, wW, wH, % "ahk_id " . obj.ID
        if (wX < -30000 || wW <= 0)
            continue

        isDisconnected := false
        isFrozen := false

        if (FindText(fX, fY, wX, wY, wX+wW, wY+wH, 0.1, 0.1, Global_DisconnectImg))
            isDisconnected := true
        else if (IsScreenFrozen(obj.ID))
            isFrozen := true

        if (isFrozen || isDisconnected) {
            Reason := isDisconnected ? "연결 끊김" : "화면 멈춤"
            AddLog("❄️ [강제테스트] " . obj.Name . " " . Reason . " 감지", obj.Name)

            CrashCounts[idx]++
            GuiControl, Main:, CrashCnt%idx%, % CrashCounts[idx] . "회 팅김"

            ProcessRecovery(idx, Reason . " 복구")
            hitCount++
        } else {
            AddLog("✅ [강제테스트] " . obj.Name . " 정상", obj.Name)
        }
    }

    LastGlobalCheckTime := A_TickCount
    if (!hasTarget)
        AddLog("⚠️ [강제테스트] 점검 대상 클라이언트가 없습니다.")
    else if (hitCount = 0)
        AddLog("ℹ️ [강제테스트] 멈춤/끊김 미검출")
    else
        AddLog("✅ [강제테스트] 감지/복구 수행: " . hitCount . "개")
return

ResetTitles:
    MsgBox, 36, 확인, 저장된 창 이름을 모두 기본값으로 되돌리시겠습니까?
    IfMsgBox, No
        return

    Loop, 6 {
        defT := DefaultTitles[A_Index]
        Titles[A_Index] := defT
        IniWrite, %defT%, %MainIni%, Settings, Title_%A_Index%
        GuiControl, Main:, ClientName%A_Index%, %defT%
        
        ; 연결 상태도 초기화
        GuiControl, Main:, Status%A_Index%, [미연동]
        Clients[A_Index] := {ID: 0}
    }
    AddLog("모든 클라이언트 이름이 기본값으로 초기화되었습니다.")
return

; ==============================================================================
; [좌표 변환 함수] 화면(Screen) 좌표 -> 게임 내부(Client) 좌표로 변환
; ==============================================================================
ScreenToClient(hwnd, ByRef x, ByRef y) {
    VarSetCapacity(pt, 8)
    NumPut(x, pt, 0, "Int")
    NumPut(y, pt, 4, "Int")
    ; 윈도우 테두리, 타이틀바를 제외한 '실제 게임 화면' 기준으로 변환
    DllCall("ScreenToClient", "Ptr", hwnd, "Ptr", &pt)
    x := NumGet(pt, 0, "Int")
    y := NumGet(pt, 4, "Int")
}

; ===========================================================================
; [추가됨] 매크로 반복 체크박스 즉시 갱신
; ===========================================================================
UpdateMacroCheck:
    ; 체크박스 상태를 즉시 변수에 저장합니다.
    Gui, Main:Submit, NoHide
    
    if (UseMacroRepeat)
        AddLog("매크로 반복 기능이 [활성화] 되었습니다.")
    else
        AddLog("매크로 반복 기능이 [비활성화] 되었습니다.")
return


; ===========================================================================
; [F7 스마트 캡처 V30 - 듀얼 모드 (파일 vs 코드)]
; ============================================================================

F7::
    CoordMode, Mouse, Screen
    MouseGetPos, mX, mY
    
    ; 캡처 메뉴 GUI 생성
    Gui, CapMenu: New, +AlwaysOnTop -Caption +ToolWindow +OwnerMain
    Gui, CapMenu: Color, FFFFFF
    
    ; [수정 핵심] 폰트 설정에서 'bold'를 줍니다.
    Gui, CapMenu: Font, s10 bold, Malgun Gothic
    
    ; 텍스트 추가 (여기서 bold 옵션 삭제)
    Gui, CapMenu: Add, Text, x10 y10 w180 h20 Center cBlue, [캡처 모드 선택]
    
    ; [중요] 버튼은 굵게 하지 않기 위해 다시 'norm'(일반)으로 변경
    Gui, CapMenu: Font, s10 norm, Malgun Gothic
    
    Gui, CapMenu: Add, Button, x10 y40 w180 h40 gSelectCapture_File, 📁 이미지 파일로 저장`n(C:\Jamryong\img)
    Gui, CapMenu: Add, Button, x10 y90 w180 h40 gSelectCapture_Code, 📝 이미지 코드 생성`n(FindText 용)
    Gui, CapMenu: Add, Button, x10 y140 w180 h30 gCloseCapMenu, 취소
    
    ; 마우스 옆에 띄우기
    ShowX := mX + 10
    ShowY := mY + 10
    Gui, CapMenu: Show, x%ShowX% y%ShowY% w200 h180
return

CloseCapMenu:
    Gui, CapMenu: Destroy
return

; ==============================================================================
; [모드 1] 이미지 파일로 저장 (.png)
; ==============================================================================
SelectCapture_File:
    Gui, CapMenu: Destroy
    
    if (!GetScreenArea(x, y, w, h))
        return
        
    InputBox, imgName, 이미지 저장, 파일 이름을 입력하세요.`n(확장자 제외), , 300, 150, , , , , 장비분해
    if (ErrorLevel || imgName == "")
        return
        
    SaveDir := BaseFolder . "\img"
    if !FileExist(SaveDir)
        FileCreateDir, %SaveDir%
        
    FilePath := SaveDir . "\" . imgName . ".png"
    
        
    pBitmap := Gdip_BitmapFromScreen(x "|" y "|" w "|" h)
    Gdip_SaveBitmapToFile(pBitmap, FilePath)
    Gdip_DisposeImage(pBitmap)
    
    MsgBox, 64, 성공, 파일이 저장되었습니다.`n📂 %FilePath%
return

; ==============================================================================
; [모드 2] 이미지 코드 생성 (기존 방식)
; ==============================================================================
SelectCapture_Code:
    Gui, CapMenu: Destroy
    
    if (!GetScreenArea(x, y, w, h))
        return

    global TempFile := BaseFolder . "\Temp_Cap.bmp"
    FindText().SavePic(TempFile, x, y, x+w, y+h)

    TextCode := ""
    Loop, 3 {
        TextCode := FindText().GetTextFromScreen(x, y, x+w, y+h, "*")
        if (TextCode != "")
            break
        Sleep, 100
    }
    if (TextCode == "")
        TextCode := FindText().GetTextFromScreen(x, y, x+w, y+h, 150)
    
    global CurrentAsciiCode := TextCode
    
    InvokeLabelNow("SaveCodeRoutine")
return

; ==============================================================================
; [공용 함수] 화면 드래그
; ==============================================================================
GetScreenArea(ByRef x, ByRef y, ByRef w, ByRef h) {
    CoordMode, Mouse, Screen
    
    Gui, ScreenCover: New, +AlwaysOnTop -Caption +ToolWindow +LastFound -DPIScale +E0x08000000
    Gui, ScreenCover: Color, 000000
    WinSet, Transparent, 50
    Gui, ScreenCover: Show, x0 y0 w%A_ScreenWidth% h%A_ScreenHeight% NoActivate
    
    DllCall("SetCursor", "Ptr", DllCall("LoadCursor", "Ptr", 0, "Int", 32515))
    
    Loop {
        MouseGetPos, mX, mY
        ToolTip, [영역 선택]`n좌클릭 드래그하여 영역 지정`n(ESC: 취소), mX+20, mY+20
        
        if GetKeyState("LButton", "P")
            break
        if GetKeyState("Esc", "P") {
            Gui, ScreenCover: Destroy
            ToolTip
            return false
        }
        Sleep, 30
    }
    ToolTip 
    MouseGetPos, x1, y1
    
    Gui, BoxGui: New, +AlwaysOnTop -Caption +ToolWindow +LastFound -DPIScale +E0x20
    Gui, BoxGui: Color, Red
    WinSet, Transparent, 100
    
    Loop {
        if !GetKeyState("LButton", "P")
            break
        MouseGetPos, x2, y2
        w := Abs(x2 - x1), h := Abs(y2 - y1)
        x := Min(x1, x2), y := Min(y1, y2)
        Gui, BoxGui: Show, NA x%x% y%y% w%w% h%h%
        Sleep, 10
    }
    
    Gui, BoxGui: Destroy
    Gui, ScreenCover: Destroy
    Sleep, 200 
    
    if (w < 5 || h < 5)
        return false
        
    return true
}

; ==============================================================================
; [수정] 코드 저장 + 자동 복사 + 리스트 갱신 함수 호출
; ==============================================================================
SaveCodeRoutine:
    try {
        if (CurrentAsciiCode == "") {
            MsgBox, 48, 실패, 생성된 코드가 없습니다.
            return
        }
        
        ; 이름 입력
        InputBox, imgName, 이미지 저장, 이름을 입력하세요.`n(확장자 제외), , 300, 150
        if (ErrorLevel || imgName = "")
            return
        
        ; 1. 코드 가공 (이름 적용)
        FinalCode := StrReplace(CurrentAsciiCode, "|<>", "|<" . imgName . ">")
        
        ; ★★★ [핵심] 완성된 코드를 즉시 클립보드에 복사! ★★★
        Clipboard := FinalCode
        
        ; 2. INI 파일 저장
        FinalValue := FinalCode . "_@TIME@_" . A_Now
        IniWrite, %FinalValue%, %BaseFolder%\ImageLib.ini, Images, %imgName%
        
        ; 3. 이미지 파일 저장
        ImgSaveDir := BaseFolder . "\SavedImages"
        if !FileExist(ImgSaveDir)
            FileCreateDir, %ImgSaveDir%
        
        if FileExist(TempFile)
            FileCopy, %TempFile%, %ImgSaveDir%\%imgName%.png, 1
        
        ; 4. 리스트 갱신 (창이 열려있다면)
        TargetSelectName := imgName
        IfWinNotExist, 이미지 관리
            InvokeLabelNow("OpenImageManager") ; (여는 건 라벨로 유지)
        else {
            WinActivate, 이미지 관리
           InvokeLabelNow("ReloadImgList") ; ★ 여기가 핵심! (함수로 호출)
        }
        
        ; 완료 알림
        ToolTip, [%imgName%] 저장 및 복사 완료! (Ctrl+V 가능)
        SoundBeep, 700, 100
        Sleep, 1500
        ToolTip
        
    } finally {
        if FileExist(TempFile)
            FileDelete, %TempFile%
        CurrentAsciiCode := ""
    }
return

; ==============================================================================
; [이미지 관리자 & 테스트 도구 V4 - 자동 활성화 기능 탑재]
; ==============================================================================
global TargetSelectName := "" 

OpenImageManager:
    WinGetPos, mX, mY, , , ahk_id %MainHwnd%
    
    Gui, ImgMgr: New, +OwnerMain +HwndImgMgrHwnd, 이미지 관리 & 테스트
    Gui, ImgMgr: Color, FFFFFF
    Gui, ImgMgr: Font, s9, Malgun Gothic
    
    Gui, ImgMgr: Add, Tab3, x10 y10 w580 h430, 📂 저장된 이미지|🧪 이미지 인식 테스트
    
    ; [탭 1] 저장된 이미지 관리 (기존 동일)
    Gui, ImgMgr: Tab, 1
        Gui, ImgMgr: Add, Button, x460 y40 w110 h30 gF7, 📷 새 이미지 캡처(F7)
        Gui, ImgMgr: Add, Text, x20 y45, 저장된 이미지 목록 (더블클릭: 원본확인)
        Gui, ImgMgr: Add, ListView, x20 y75 w550 h280 vImgList gImgListEvent Grid +LV0x20, 이름|이미지 코드|저장일시|타입
        Gui, ImgMgr: Add, Button, x20 y370 w80 h30 gCopyImgCode, 📋 복사
        Gui, ImgMgr: Add, Button, x105 y370 w80 h30 gCheckImgLoc, 👁️ 위치확인
        Gui, ImgMgr: Add, Button, x190 y370 w80 h30 gViewOriginalImg, 🖼️ 원본보기
        Gui, ImgMgr: Add, Button, x275 y370 w80 h30 gOpenImgFolder, 📂 폴더열기
        Gui, ImgMgr: Add, Button, x360 y370 w80 h30 gDeleteImg, 🗑️ 삭제
        Gui, ImgMgr: Add, Button, x490 y370 w80 h30 gCloseImgMgr, 닫기
        LV_ModifyCol(1, 100), LV_ModifyCol(2, 250), LV_ModifyCol(3, 110), LV_ModifyCol(4, 50)
    
    ; [탭 2] 이미지 인식 테스트 (업그레이드됨)
    Gui, ImgMgr: Tab, 2
        Gui, ImgMgr: Add, GroupBox, x20 y40 w550 h100, 1. 테스트 대상 선택 (필수)
        Gui, ImgMgr: Add, Text, x35 y65, 테스트할 클라이언트:
        ; [추가] 어떤 창을 테스트할지 선택하게 함
        Gui, ImgMgr: Add, DropDownList, x160 y62 w150 vSelTestClient Choose1, 클라이언트 1|클라이언트 2|클라이언트 3|클라이언트 4
        Gui, ImgMgr: Add, Text, x320 y65 cBlue, (선택하면 자동으로 창을 띄우고 검색합니다)

        Gui, ImgMgr: Add, GroupBox, x20 y150 w550 h90, 2. 파일(.png) 테스트
        Gui, ImgMgr: Add, Text, x35 y175, 파일 경로:
        Gui, ImgMgr: Add, Edit, x95 y172 w350 h25 vTestFilePath, %BaseFolder%\img\장비분해.png
        Gui, ImgMgr: Add, Button, x455 y171 w100 h27 gTestImageFile, 🚀 즉시 찾기

        Gui, ImgMgr: Add, GroupBox, x20 y250 w550 h100, 3. 코드(Text) 테스트
        Gui, ImgMgr: Add, Text, x35 y275, 코드 입력:
        Gui, ImgMgr: Add, Edit, x95 y272 w350 h60 vTestCodeStr, 
        Gui, ImgMgr: Add, Button, x455 y272 w100 h60 gTestImageCode, 🚀 즉시 찾기
        
        Gui, ImgMgr: Add, GroupBox, x20 y360 w550 h60, 4. 옵션
        Gui, ImgMgr: Add, Radio, x35 y380 w100 h20 vRadioScreen Checked, 전체화면
        Gui, ImgMgr: Add, Radio, x140 y380 w100 h20 vRadioClient, 창 내부(Client)
        Gui, ImgMgr: Add, Text, x260 y383, 오차범위:
        Gui, ImgMgr: Add, Edit, x320 y380 w50 h20 vTestTolerance Number Center, 70

    InvokeLabelNow("ReloadImgList")
    Gui, ImgMgr: Show, x%mX% y%mY% w600 h460
return


; ==============================================================================
; [테스트 B] 코드(FindText) 찾기 (다중 검색 + 점멸 효과 적용)
TestImageCode:
    Gui, ImgMgr: Submit, NoHide
    
    if (TestCodeStr == "") {
        MsgBox, 48, 알림, 코드를 입력해주세요.
        return
    }
    
    ; 1. 클라이언트 선택 및 활성화
    ClientIndex := SubStr(SelTestClient, 7, 1)
    TargetTitle := Titles[ClientIndex]
    
    if !WinExist(TargetTitle) {
        MsgBox, 48, 오류, [%TargetTitle%] 창 없음.
        return
    }
    
    WinActivate, %TargetTitle%
    Sleep, 300 ; 창이 뜨는 시간 대기
    
    ; 2. FindText 실행 (반환값 'ok'는 찾은 결과들의 배열입니다)
    ; 0, 0, 0, 0 -> 전체 화면 검색
    if (ok := FindText(fX, fY, 0, 0, 0, 0, 0.1, 0.1, TestCodeStr)) {
        
        FoundCount := ok.MaxIndex() ; 찾은 총 개수
        TargetRects := []           ; 시각 효과용 좌표 배열
        ResultStr := ""             ; 메시지박스 출력용 텍스트
        
        ; 3. 결과 순회 (Loop)
        ; FindText의 결과값 'v'는 [x, y, w, h, comment, score] 형태의 배열입니다.
        For i, v in ok {
            ; v[1]=X, v[2]=Y, v[3]=W, v[4]=H
            
            ; [시각 효과] 최대 10개까지만 저장
            if (i <= 10) {
                TargetRects.Push({x: v[1], y: v[2], w: v[3], h: v[4]})
            }
            
            ; [텍스트 출력] 최대 20개까지만 글자로 표시 (너무 길면 잘림)
            if (i <= 20) {
                ResultStr .= "No." . i . " : " . v[1] . ", " . v[2] . "`n"
            }
        }
        
        ; 4. 동시 점멸 효과 발동! (아까 만든 그 멋진 효과)
        SpotlightEffect(TargetRects)
        
        ; 5. 결과 메시지 출력
        MsgBox, 64, 성공, ✅ 총 %FoundCount%개를 찾았습니다!`n(화면 표시는 최대 10곳)`n`n[발견 좌표 목록]`n%ResultStr%
        
    } else {
        MsgBox, 48, 실패, ❌ 코드를 하나도 못 찾았습니다.`n(오차범위 0.1 / 배경 변화 확인 필요)
    }
    
    Gui, ImgMgr: Show
return

; ==============================================================================
; [테스트 A] 파일 찾기 (좌표 변환 로직 추가 - 위치 정확도 100%)
TestImageFile:
    Gui, ImgMgr: Submit, NoHide
    
    if !FileExist(TestFilePath) {
        MsgBox, 48, 오류, 파일이 없습니다.`n%TestFilePath%
        return
    }
    
    ; 1. 이미지 크기 구하기
    pTempBmp := Gdip_CreateBitmapFromFile(TestFilePath)
    Gdip_GetImageDimensions(pTempBmp, imgW, imgH)
    Gdip_DisposeImage(pTempBmp)
    if (imgW < 10) { 
        imgW := 50, imgH := 50
    }

    ; 2. 모드 설정 및 창 활성화
    if (RadioScreen == 1) {
        ; [전체화면 모드]
        CoordMode, Pixel, Screen
        CoordMode, Mouse, Screen
        sX := 0, sY := 0, sW := A_ScreenWidth, sH := A_ScreenHeight
        ModeMsg := "전체화면(Screen)"
        baseHwnd := 0 ; 전체화면일 땐 기준 창 없음
    } else {
        ; [창내부 모드]
        CoordMode, Pixel, Client
        CoordMode, Mouse, Client
        ClientIndex := SubStr(SelTestClient, 7, 1)
        TargetTitle := Titles[ClientIndex]
        
        if !WinExist(TargetTitle) {
            MsgBox, 48, 오류, [%TargetTitle%] 창을 찾을 수 없습니다.
            return
        }
        WinActivate, %TargetTitle%
        Sleep, 300
        
        ; 현재 활성화된 창의 ID를 저장 (좌표 변환용)
        baseHwnd := WinExist("A") 
        
        WinGetPos, , , sW, sH, ahk_id %baseHwnd%
        sX := 0, sY := 0
        ModeMsg := "[" . TargetTitle . "] 내부"
    }
    
    ; 3. 검색 시작
    FoundCount := 0
    TargetRects := [] 
    SearchX := sX
    SearchY := sY
    StartTime := A_TickCount
    
    Loop {
        ImageSearch, fX, fY, SearchX, SearchY, sW, sH, *%TestTolerance% %TestFilePath%
        
        if (ErrorLevel == 0) {
            FoundCount++
            
            ; ★★★ [핵심 수정] 좌표 변환 로직 (Client -> Screen) ★★★
            finalX := fX
            finalY := fY
            
            ; 만약 '창 내부(Client)' 모드라면, 찾은 좌표를 '전체 화면(Screen)' 좌표로 변환해야 함
            if (RadioScreen == 0 && baseHwnd != 0) {
                VarSetCapacity(pt, 8)
                NumPut(fX, pt, 0, "Int")
                NumPut(fY, pt, 4, "Int")
                ; Client 좌표를 Screen 좌표로 변환해주는 윈도우 API 호출
                DllCall("ClientToScreen", "Ptr", baseHwnd, "Ptr", &pt)
                finalX := NumGet(pt, 0, "Int")
                finalY := NumGet(pt, 4, "Int")
            }
            
            ; 변환된 Screen 좌표(finalX, finalY)를 저장
            if (FoundCount <= 10) {
                TargetRects.Push({x: finalX, y: finalY, w: imgW, h: imgH})
            }
            
            ; 다음 검색 위치 설정 (Client 좌표계 기준)
            SearchX := fX + 5 
            
        } else {
            break 
        }
        
        if (FoundCount >= 100)
            break
    }
    
    ElapsedTime := A_TickCount - StartTime
    
    ; 4. 결과 처리
    if (FoundCount > 0) {
        ; 변환된 정확한 위치에 점멸 효과
        SpotlightEffect(TargetRects)
        
        MsgBox, 64, 성공, ✅ 총 %FoundCount%개의 이미지를 찾았습니다!`n(모드: %ModeMsg%)`n`n소요시간: %ElapsedTime%ms
    } else {
        MsgBox, 48, 실패, ❌ 이미지를 하나도 못 찾았습니다.`n(모드: %ModeMsg% / 오차: %TestTolerance%)
    }
    
    Gui, ImgMgr: Show
return

; ==============================================================================
; [기존 유지 함수들]
OpenImgFolder:
    ImgSaveDir := BaseFolder . "\SavedImages"
    if !FileExist(ImgSaveDir)
        FileCreateDir, %ImgSaveDir%
    Run, %ImgSaveDir%
return

ReloadImgList:
    IfWinNotExist, 이미지 관리
        return
    Gui, ImgMgr: Default
    GuiControl, -Redraw, ImgList
    LV_Delete()
    IniRead, SectionData, %BaseFolder%\ImageLib.ini, Images
    ImgSaveDir := BaseFolder . "\SavedImages"
    Loop, Parse, SectionData, `n
    {
        RowData := A_LoopField
        SplitPos := InStr(RowData, "=")
        if (SplitPos > 0) {
            Key := SubStr(RowData, 1, SplitPos-1)
            Val := SubStr(RowData, SplitPos+1)
            HasFile := FileExist(ImgSaveDir . "\" . Key . ".png") ? "파일" : "코드"
            LV_Add("", Key, Val, " - ", HasFile)
        }
    }
    GuiControl, +Redraw, ImgList
return

ImgListEvent:
    if (A_GuiEvent == "DoubleClick") {
        Gui, ImgMgr: Default
        Row := A_EventInfo
        LV_GetText(HasFile, Row, 4)
        if (HasFile == "파일")
            InvokeLabelNow("ViewOriginalImg")
        else
            InvokeLabelNow("CopyImgCode")
    }
return

ViewOriginalImg:
    Gui, ImgMgr: Default
    Row := LV_GetNext(0, "F")
    if (Row == 0) return
    LV_GetText(ImgName, Row, 1)
    ImgPath := BaseFolder . "\SavedImages\" . ImgName . ".png"
    if !FileExist(ImgPath) {
        MsgBox, 48, 알림, 파일 없음.
        return
    }
    Gui, ViewImg: New, +AlwaysOnTop -Caption +ToolWindow +OwnerImgMgr
    Gui, ViewImg: Color, 222222
    Gui, ViewImg: Add, Picture, vMyViewPic, %ImgPath%
    Gui, ViewImg: Add, Button, gCloseViewImg, 닫기
    Gui, ViewImg: Show, AutoSize
return

CloseViewImg:
    Gui, ViewImg: Destroy
return

DeleteImg:
    Gui, ImgMgr: Default
    Row := LV_GetNext(0, "F")
    if (Row == 0) return
    LV_GetText(Name, Row, 1)
    MsgBox, 36, 확인, 삭제?
    IfMsgBox, No
        return
    IniDelete, %BaseFolder%\ImageLib.ini, Images, %Name%
    FileDelete, %BaseFolder%\SavedImages\%Name%.png
    LV_Delete(Row)
return

; ==============================================================================
; [수정] 선택한 항목의 '순수 코드'만 정확히 복사하기
; ==============================================================================
CopyImgCode:
    Gui, ImgMgr: Default
    
    ; 1. 현재 선택된 줄(Row) 번호 가져오기
    Row := LV_GetNext(0, "F") ; F = Focused (선택된 항목)
    
    if (Row == 0) {
        MsgBox, 48, 알림, 복사할 이미지를 먼저 선택해주세요.
        return
    }
    
    ; 2. 선택된 줄의 첫 번째 칸(이름) 가져오기
    LV_GetText(TargetName, Row, 1)
    
    ; 3. INI 파일에서 '그 이름'에 해당하는 값만 딱 읽어오기
    ; (주의: Key 자리에 %TargetName%이 정확히 들어가야 전체가 안 딸려옵니다)
    IniRead, RawVal, %BaseFolder%\ImageLib.ini, Images, %TargetName%
    
    ; 값이 없거나 에러면 중단
    if (RawVal == "" || RawVal == "ERROR") {
        MsgBox, 48, 오류, 데이터를 읽을 수 없습니다.
        return
    }
    
    ; 4. 뒤에 붙은 시간 정보(_@TIME@_...) 잘라내기
    if InStr(RawVal, "_@TIME@_") {
        FinalCode := StrSplit(RawVal, "_@TIME@_")[1]
    } else {
        FinalCode := RawVal
    }
    
    ; 5. 클립보드 복사
    Clipboard := FinalCode
    
    MsgBox, 64, 성공, [%TargetName%] 코드가 복사되었습니다.`n(Ctrl+V로 사용하세요)
return
CheckImgLoc:
    Gui, ImgMgr:Default
    Gui, ImgMgr:ListView, ImgList
    Row := LV_GetNext(0, "F")
    if (Row == 0) {
        MsgBox, 48, 알림, 위치를 확인할 이미지를 먼저 선택해주세요.
        return
    }

    LV_GetText(ImgName, Row, 1)
    LV_GetText(HasFile, Row, 4)
    Gui, ImgMgr:Submit, NoHide

    ; 테스트 옵션 보정
    if (TestTolerance = "" || TestTolerance < 0)
        TestTolerance := 70

    baseHwnd := 0
    if (RadioScreen == 1) {
        CoordMode, Pixel, Screen
        CoordMode, Mouse, Screen
        sX := 0, sY := 0, sW := A_ScreenWidth, sH := A_ScreenHeight
        ModeMsg := "전체화면(Screen)"
    } else {
        CoordMode, Pixel, Client
        CoordMode, Mouse, Client
        ClientIndex := 1
        if RegExMatch(SelTestClient, "\d+", m)
            ClientIndex := m
        TargetTitle := Titles[ClientIndex]
        if !WinExist(TargetTitle) {
            MsgBox, 48, 오류, [%TargetTitle%] 창을 찾을 수 없습니다.
            return
        }
        WinActivate, %TargetTitle%
        Sleep, 200
        baseHwnd := WinExist("A")
        WinGetPos, , , sW, sH, ahk_id %baseHwnd%
        sX := 0, sY := 0
        ModeMsg := "[" . TargetTitle . "] 내부"
    }

    FoundCount := 0
    TargetRects := []
    ResultStr := ""

    if (HasFile == "파일") {
        ImgPath := BaseFolder . "\SavedImages\" . ImgName . ".png"
        if !FileExist(ImgPath)
            ImgPath := BaseFolder . "\img\" . ImgName . ".png"
        if !FileExist(ImgPath) {
            MsgBox, 48, 오류, 이미지 파일이 없습니다.`n%ImgPath%
            CoordMode, Pixel, Client
            CoordMode, Mouse, Client
            return
        }

        pTempBmp := Gdip_CreateBitmapFromFile(ImgPath)
        Gdip_GetImageDimensions(pTempBmp, imgW, imgH)
        Gdip_DisposeImage(pTempBmp)
        if (imgW < 10)
            imgW := 50, imgH := 50

        SearchX := sX, SearchY := sY
        Loop {
            ImageSearch, fX, fY, SearchX, SearchY, sW, sH, *%TestTolerance% %ImgPath%
            if (ErrorLevel != 0)
                break

            FoundCount++
            finalX := fX, finalY := fY

            if (RadioScreen == 0 && baseHwnd != 0) {
                VarSetCapacity(pt, 8)
                NumPut(fX, pt, 0, "Int")
                NumPut(fY, pt, 4, "Int")
                DllCall("ClientToScreen", "Ptr", baseHwnd, "Ptr", &pt)
                finalX := NumGet(pt, 0, "Int")
                finalY := NumGet(pt, 4, "Int")
            }

            if (FoundCount <= 10)
                TargetRects.Push({x: finalX, y: finalY, w: imgW, h: imgH})
            if (FoundCount <= 20)
                ResultStr .= "No." . FoundCount . " : " . finalX . ", " . finalY . "`n"

            SearchX := fX + 5
            SearchY := fY
            if (SearchX >= sW)
                break
            if (FoundCount >= 100)
                break
        }
    } else {
        IniRead, RawVal, %BaseFolder%\ImageLib.ini, Images, %ImgName%
        if (RawVal == "" || RawVal == "ERROR") {
            MsgBox, 48, 오류, 코드 데이터를 읽을 수 없습니다.
            CoordMode, Pixel, Client
            CoordMode, Mouse, Client
            return
        }

        if InStr(RawVal, "_@TIME@_")
            FindCode := StrSplit(RawVal, "_@TIME@_")[1]
        else
            FindCode := RawVal

        if (ok := FindText(fX, fY, sX, sY, sW, sH, 0.1, 0.1, FindCode)) {
            For i, v in ok {
                FoundCount++
                finalX := v[1], finalY := v[2], rW := v[3], rH := v[4]

                if (RadioScreen == 0 && baseHwnd != 0) {
                    VarSetCapacity(pt2, 8)
                    NumPut(finalX, pt2, 0, "Int")
                    NumPut(finalY, pt2, 4, "Int")
                    DllCall("ClientToScreen", "Ptr", baseHwnd, "Ptr", &pt2)
                    finalX := NumGet(pt2, 0, "Int")
                    finalY := NumGet(pt2, 4, "Int")
                }

                if (i <= 10)
                    TargetRects.Push({x: finalX, y: finalY, w: rW, h: rH})
                if (i <= 20)
                    ResultStr .= "No." . i . " : " . finalX . ", " . finalY . "`n"
            }
        }
    }

    if (FoundCount > 0) {
        SpotlightEffect(TargetRects)
        MsgBox, 64, 성공, ✅ 총 %FoundCount%개를 찾았습니다!`n(모드: %ModeMsg%)`n`n[발견 좌표 목록]`n%ResultStr%
    } else {
        MsgBox, 48, 실패, ❌ 찾지 못했습니다.`n(모드: %ModeMsg% / 오차: %TestTolerance%)
    }

    CoordMode, Pixel, Client
    CoordMode, Mouse, Client
    Gui, ImgMgr:Show
    return
    
CloseImgMgr:
    Gui, ImgMgr: Destroy
return
; ==============================================================================
; [시각 효과] 스포트라이트 (배경 어둡게 + 다중 타겟 동시 점멸)
; Rects: [{x,y,w,h}, {x,y,w,h}...] 배열을 받아서 처리
; ==============================================================================
SpotlightEffect(Rects) {
    global pToken
    SysGet, vX, 76
    SysGet, vY, 77
    SysGet, vW, 78
    SysGet, vH, 79
    
    ; GUI 생성 (전체화면, 투명, 클릭 통과)
    Gui, Spotlight: New, +AlwaysOnTop -Caption +ToolWindow +LastFound +E0x80000 +E0x20
    Gui, Spotlight: Show, NA x%vX% y%vY% w%vW% h%vH%
    hwnd := WinExist()
    
    hbm := 0
    hdc := 0
    obm := 0
    G := 0
    pBrushDim := 0
    pBrushClear := 0
    pPenRed := 0
    pPenBlue := 0
    
    try {
        hbm := CreateDIBSection(vW, vH)
        hdc := CreateCompatibleDC()
        obm := SelectObject(hdc, hbm)
        G := Gdip_GraphicsFromHDC(hdc)
        
        ; 1. 배경 전체를 반투명 검은색으로 칠하기 (Dimming)
        pBrushDim := Gdip_BrushCreateSolid(0x96000000) ; 0x96 = 약 60% 불투명도
        Gdip_FillRectangle(G, pBrushDim, 0, 0, vW, vH)
        Gdip_DeleteBrush(pBrushDim)
        pBrushDim := 0
        
        ; 2. 찾은 위치들에 구멍 뚫기 (투명하게 만들기)
        Gdip_SetCompositingMode(G, 1) ; 덮어쓰기 모드 (지우개 효과)
        pBrushClear := Gdip_BrushCreateSolid(0x00000000) ; 완전 투명
        
        For i, rc in Rects {
            ; 좌표 보정 (모니터 다중 환경 고려 vX, vY 빼기)
            Gdip_FillRectangle(G, pBrushClear, rc.x - vX, rc.y - vY, rc.w, rc.h)
        }
        
        Gdip_DeleteBrush(pBrushClear)
        pBrushClear := 0
        Gdip_SetCompositingMode(G, 0) ; 다시 그리기 모드로 복구
        
        ; 3. 펜 생성 (두께 5)
        pPenRed := Gdip_CreatePen(0xFFFF0000, 5)
        pPenBlue := Gdip_CreatePen(0xFF0000FF, 5)
        
        ; 4. 동시 점멸 루프 (빨강 <-> 파랑)
        Loop, 5 { ; 5회 반복 (빨강->파랑 한 세트)
            
            ; [빨강 단계] 모든 사각형에 빨강 테두리 그리기
            For i, rc in Rects {
                Gdip_DrawRectangle(G, pPenRed, rc.x - vX, rc.y - vY, rc.w, rc.h)
            }
            UpdateLayeredWindow(hwnd, hdc, vX, vY, vW, vH)
            Sleep, 200
            
            ; [파랑 단계] 모든 사각형에 파랑 테두리 덮어쓰기
            For i, rc in Rects {
                Gdip_DrawRectangle(G, pPenBlue, rc.x - vX, rc.y - vY, rc.w, rc.h)
            }
            UpdateLayeredWindow(hwnd, hdc, vX, vY, vW, vH)
            Sleep, 200
        }
        
    } catch e {
        ; 오류 무시 (AddLog가 없으면 삭제 가능)
    } finally {
        ; 리소스 정리 (필수)
        if (pPenBlue)
            Gdip_DeletePen(pPenBlue)
        if (pPenRed)
            Gdip_DeletePen(pPenRed)
        if (pBrushClear)
            Gdip_DeleteBrush(pBrushClear)
        if (pBrushDim)
            Gdip_DeleteBrush(pBrushDim)
        if (G)
            Gdip_DeleteGraphics(G)
        if (obm && hdc)
            SelectObject(hdc, obm)
        if (hbm)
            DeleteObject(hbm)
        if (hdc)
            DeleteDC(hdc)
        
        Gui, Spotlight: Destroy
    }
}


; ==========================================================================
; [함수] 텔레그램 원격 제어 초기화 및 시작
; ==========================================================================
StartTeleControl() {
    global Telegram_Token, LastUpdateID, TeleCheckInterval

    if (TeleCheckInterval = "" || TeleCheckInterval = "ERROR" || TeleCheckInterval < 1000)
        TeleCheckInterval := 2000

    URL := "https://api.telegram.org/bot" . Telegram_Token . "/getUpdates?limit=1&offset=-1"
    whr := ""
    
    try {
        whr := ComObjCreate("WinHttp.WinHttpRequest.5.1")
        whr.Open("GET", URL, false)
        whr.Send()
        if RegExMatch(whr.ResponseText, """update_id"":(\d+)", match)
            LastUpdateID := match1
    } catch e {
        AddLog("텔레그램 초기화 실패: " . e.Message)
    }
    
    ; COM 객체 해제
    if (IsObject(whr)) {
        ObjRelease(whr)
        whr := ""
    }
    
    AddLog("🤖 텔레그램 원격 제어중...")
    
    SetTimer, CheckTeleCommand, Off 
    SetTimer, CheckTeleCommand, %TeleCheckInterval%
}


CheckTeleCommand:
    if (TeleCmdBusy)
        return
    TeleCmdBusy := 1

    ; [타임아웃 기능] 60초 지나면 로그인 대기 모드 해제
    if (TeleLoginStep == 1) {
        if (A_TickCount - LoginReqTime > 60000) {
            TeleLoginStep := 0
            LoginReqTime := 0
            AddLog("⏳ 로그인 대기 시간이 초과되어 취소되었습니다.")
        }
    }

    URL := "https://api.telegram.org/bot" . Telegram_Token . "/getUpdates?offset=" . (LastUpdateID + 1) . "&limit=1&timeout=2"
    whr := ""
    
    try {
        whr := ComObjCreate("WinHttp.WinHttpRequest.5.1")
        whr.Open("GET", URL, true)
        whr.Send()
        whr.WaitForResponse(1)
        Response := whr.ResponseText
    } catch e {
        Goto, CheckTeleCommand_Cleanup
    }
    
    if (!Response || Response == "" || !InStr(Response, """ok"":true")) {
        Goto, CheckTeleCommand_Cleanup
    }
    
    if RegExMatch(Response, """update_id"":(\d+)", matchID) {
        LastUpdateID := matchID1 
        
        RegExMatch(Response, """chat"":\{""id"":(\d+)", matchChatID)
        if (matchChatID1 != Telegram_chatid) {
            Goto, CheckTeleCommand_Cleanup
        }
        
        RegExMatch(Response, """text"":""(.*?)""", matchText)
        rawMsg := matchText1
        cleanMsg := UnEscapeUnicode(rawMsg)
        cleanMsg := Trim(cleanMsg)
        
        ; ==========================================================
        ; [명령어 처리] ForceLoginAction 대신 ProcessRecovery 사용!
        ; ==========================================================
        
        ; [1] 로그인 번호 대기 모드일 때
        if (TeleLoginStep == 1) {
            TeleLoginStep := 0
            LoginReqTime := 0
            runResult := RunTeleLoginSelection(cleanMsg)
            if (runResult != "OK")
                SendTele("🚫 취소되었습니다. (예: 3 또는 3,4,5 또는 7)")
        }

        ; [2] 일반 명령어 (로그인 요청 등)
        else if RegExMatch(cleanMsg, "^로그인\s+(.+)$", matchLoginMulti) {
            runResult := RunTeleLoginSelection(matchLoginMulti1)
            if (runResult != "OK")
                SendTele("⚠️ 형식 오류: 로그인 3,4,5  또는  로그인 7")
        }
        else if (cleanMsg = "로그인") {
            ListMsg := "🔄 [재실행 대상을 선택하세요]`n"
            Loop, 6 {
                currentName := Titles[A_Index]
                if (Clients[A_Index].ID && WinExist("ahk_id " . Clients[A_Index].ID))
                    status := "🟢"
                else
                    status := "⚫"
                ListMsg .= A_Index . ". " . currentName . " " . status . "`n"
            }
            ListMsg .= "7. 전체 실행`n`n"
            ListMsg .= "입력 예시: 3  또는  3,4,5  또는  7"
            
            SendTele(ListMsg)
            TeleLoginStep := 1 
            LoginReqTime := A_TickCount
        }
        
 

        else if (cleanMsg = "명령어" || cleanMsg = "도움말") {
            HelpMsg := "📜 [잠룡매크로 명령어 목록]`n`n"
            HelpMsg .= "📸 ㅋㅊ (또는 캡처)`n"
            HelpMsg .= "   - 현재 연동된 게임 화면들을 캡쳐 후 전송합니다.`n`n"
            
            HelpMsg .= "📊 상태`n"
            HelpMsg .= "   - 각 클라이언트의 팅김 횟수, 분해 횟수와 CPU/RAM 상태를 봅니다.`n`n"
            
            HelpMsg .= "🔄 로그인`n"
            HelpMsg .= "   - 번호 선택 후 실행 (예: 3 / 3,4,5 / 7=전체)`n"
            HelpMsg .= "   - 또는 바로 입력: 로그인 3,4,5`n`n"
            
            HelpMsg .= "🚨 강제복구`n"
            HelpMsg .= "   - 멈춤/팅김 감지 기능을 즉시 강제로 1회 실행합니다.`n`n"
            
            SendTele(HelpMsg)
        }
        else if (cleanMsg = "ㅋㅊ" || cleanMsg = "캡쳐" || cleanMsg = "캡처") {
            AddLog("📱 텔레그램: [캡처] 요청")
            SendAllCaptures("원격 요청")
        }
        else if (cleanMsg = "상태") {
            AddLog("📱 텔레그램: [상태] 확인")
            
            cpuUsage := GetCPUUsage()
            ramUsage := GetRAMUsage()
            
            StatusMsg := "🟢 [잠룡 가동 현황]`n`n"
            ConnectedCount := 0 ; 연동된 개수 카운트
            
            Loop, 6 {
                ; [수정] ID가 있을 때만(연동된 상태) 메시지에 추가
                if (Clients[A_Index].ID) {
                    StatusMsg .= Titles[A_Index] . ": "
                    StatusMsg .= "팅김 " . CrashCounts[A_Index] . "회 | "
                    StatusMsg .= "분해 " . DismantleCounts[A_Index] . "회`n"
                    ConnectedCount++
                }
            }
            
            ; 하나도 없으면 안내 메시지
            if (ConnectedCount == 0) {
                StatusMsg .= "(현재 연동된 게임이 없습니다)`n"
            }
            
            StatusMsg .= "`n━━━━━━━━━━━━━━━━`n"
            StatusMsg .= "📊 [시스템 리소스]`n"
            StatusMsg .= "CPU: " . cpuUsage . "%`n"
            StatusMsg .= "RAM: " . ramUsage . "%`n"
            
            SendTele(StatusMsg)
        }
        else if (cleanMsg = "강제복구") {
            AddLog("📱 텔레그램: [강제복구] 요청 수신")
            
            if (!Monitoring) {
                SendTele("⚠️ 감시가 꺼져있어서 실행할 수 없습니다.")
            } else {
                SendTele("🔄 강제 복구(멈춤 체크)를 즉시 실행합니다.")
                LastGlobalCheckTime := 0 
                InvokeLabelNow("MonitorRoutine")
            }
        }
        else {
            if (cleanMsg != "")
                AddLog("📩 수신된 메시지: " . cleanMsg)
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


; ==============================================================================
; [보조] 텔레그램 로그인 대상 파싱/순차 실행
; 입력 예: 3 / 3,4,5 / 7
; ==============================================================================
RunTeleLoginSelection(selText) {
    global Titles

    selText := Trim(selText)
    selText := RegExReplace(selText, "\s+", "")
    if (selText = "")
        return "INVALID"

    targets := []
    seen := {}
    hasAll := false

    tokens := StrSplit(selText, ",")
    for _, token in tokens {
        token := Trim(token)
        if (token = "")
            continue

        if !(token ~= "^[1-7]$")
            return "INVALID"

        if (token = "7") {
            hasAll := true
            continue
        }

        if !seen.HasKey(token) {
            seen[token] := 1
            targets.Push(token + 0)
        }
    }

    if (hasAll) {
        targets := []
        Loop, 6
            targets.Push(A_Index)
        SendTele("🚀 [전체] 클라이언트 재실행을 시작합니다.")
    } else {
        if (targets.MaxIndex() = "")
            return "INVALID"

        nameList := ""
        for _, idx in targets {
            if (nameList != "")
                nameList .= ", "
            nameList .= idx . "번(" . Titles[idx] . ")"
        }
        SendTele("🚀 [선택] " . nameList . " 순차 로그인 시작")
    }

    for _, idx in targets {
        ProcessRecovery(idx, "원격 로그인 실행")
        Sleep, 3000
    }

    if (hasAll)
        SendTele("✅ 전체 작업 명령 완료.")
    else
        SendTele("✅ 선택한 클라이언트 로그인 작업 완료.")

    return "OK"
}


; ==============================================================================
; [기능] 특정 클라이언트 강제 재실행 및 복구 (텔레그램용)
; ==============================================================================
ForceLoginAction(idx) {
    ; [수정] CommonIni(공용 설정 파일 경로)를 전역 변수에서 가져옵니다.
    global Clients, Titles, BaseFolder, ClientInis, Monitoring, CommonIni
    
    obj := Clients[idx]
    cFile := ClientInis[idx]
    TargetTitle := Titles[idx]
    
    AddLog("📱 텔레그램 명령: " . TargetTitle . " 재실행 시작")
    
    ; 1. 기존 창 강제 종료
    TargetID := obj.ID
    if (TargetID && WinExist("ahk_id " . TargetID)) {
        WinClose, ahk_id %TargetID%
        Sleep, 500
        WinKill, ahk_id %TargetID%
        AddLog("  └ 기존 창 종료됨.")
    }

    Sleep, 1000
    
    ; 2. 바로가기 실행
    FileNum := idx - 1
    SearchPattern := BaseFolder . "\#" . FileNum . "*.lnk"
    RunTarget := ""
    
    Loop, Files, %SearchPattern%
    {
         RunTarget := A_LoopFileFullPath
         break
    }
    
    if (RunTarget == "")
        RunTarget := BaseFolder . "\#" . FileNum . ".lnk"

    if FileExist(RunTarget) {
        Run, %RunTarget%
        AddLog("  └ 실행 파일 가동: " . RunTarget)
    } else {
        AddLog("⚠️ 실행 파일 없음! (경로: " . RunTarget . ")")
        SendTele("❌ 실행 실패: 바로가기 파일이 없습니다.")
        return
    }
    
    ; 3. 창 뜰 때까지 대기 (최대 60초)
    WinWait, %TargetTitle%, , 60
    if (ErrorLevel) {
        AddLog("❌ 창이 뜨지 않았습니다. (제목 불일치?)")
        SendTele("⚠️ [" . TargetTitle . "] 실행 실패 (시간 초과)")
        return
    }
    
    ; 4. 새 ID 갱신
    WinGet, newID, ID, %TargetTitle%
    WinGet, newPID, PID, ahk_id %newID%
    Clients[idx] := {ID: newID, PID: newPID, Name: TargetTitle}
    
    Sleep, 1000 
    
    ; ==================================================================
    ; [핵심 수정] 기존 코드의 '부팅 이미지 감지' 로직 이식
    ; ==================================================================
    
    ; 공용 설정에서 부팅 이미지 텍스트 읽어오기
    IniRead, BootImg, %CommonIni%, CommonImages, Boot_Text, %A_Space%
    
    ; 부팅 이미지가 설정되어 있다면? -> 스마트 감지 모드
    if (BootImg != "" && BootImg != "ERROR") {
        AddLog("⏳ 부팅 완료 이미지 감지 중... 60초")
        
        IsBooted := false
        Loop, 60 { ; 60초 동안 검사
            ; FindText로 전체 화면(또는 해당 창)에서 부팅 완료 이미지 검색
            if (FindText(fX, fY, 0, 0, 0, 0, 0.1, 0.1, BootImg)) {
                AddLog("✅ 부팅 완료 이미지 확인됨!")
                IsBooted := true
                break
            }
            Sleep, 1000
        }
        
        ; 60초 지나도 안 뜨면 그냥 진행 (혹시 이미지 인식이 실패했더라도 복구 시도)
        if (!IsBooted)
            AddLog("⚠️ 부팅 이미지를 찾지 못했으나 복구 루틴을 진행합니다.")
            
    } else {
        ; 부팅 이미지가 설정 안 되어 있다면? -> 그냥 20초 멍때리기 (안전장치)
        AddLog("⏳ 부팅 대기 (이미지 설정 없음, 20초 대기)")
        Sleep, 20000 
    }

    ; ==================================================================

    ; 5. 복구 루틴 실행 (로그인 과정)
    AddLog("  └ 로그인(복구) 루틴 진입")
    ExecuteRoutine(cFile, "Recovery", newID, 1)
    
    AddLog("✅ " . TargetTitle . " 재실행 완료")
}



; [수정됨] CPU 사용률 측정 함수 (즉시 측정 방식)
GetCPUUsage() {
    ; 1. 첫 번째 시간 측정 (시작점)
    VarSetCapacity(idleTime, 8, 0)
    VarSetCapacity(kernelTime, 8, 0)
    VarSetCapacity(userTime, 8, 0)
    DllCall("GetSystemTimes", "Ptr", &idleTime, "Ptr", &kernelTime, "Ptr", &userTime)
    
    idle1 := NumGet(idleTime, 0, "Int64")
    kernel1 := NumGet(kernelTime, 0, "Int64")
    user1 := NumGet(userTime, 0, "Int64")

    ; 2. 측정 구간 확보를 위해 0.5초 대기
    ; (이 시간이 길수록 더 정확하지만, 500ms면 충분합니다)
    Sleep, 500 

    ; 3. 두 번째 시간 측정 (끝점)
    VarSetCapacity(idleTime, 8, 0)
    VarSetCapacity(kernelTime, 8, 0)
    VarSetCapacity(userTime, 8, 0)
    DllCall("GetSystemTimes", "Ptr", &idleTime, "Ptr", &kernelTime, "Ptr", &userTime)
    
    idle2 := NumGet(idleTime, 0, "Int64")
    kernel2 := NumGet(kernelTime, 0, "Int64")
    user2 := NumGet(userTime, 0, "Int64")

    ; 4. 변화량(Delta) 계산
    idleDelta := idle2 - idle1
    kernelDelta := kernel2 - kernel1
    userDelta := user2 - user1
    
    totalDelta := kernelDelta + userDelta
    
    ; 5. 사용률 계산 및 반환
    if (totalDelta > 0)
        cpuUsage := Round(100.0 - (idleDelta * 100.0 / totalDelta), 1)
    else
        cpuUsage := 0
    
    return cpuUsage
}

; [추가] RAM 사용률 측정 함수
GetRAMUsage() {
    VarSetCapacity(memStatus, 64, 0)
    NumPut(64, memStatus, 0, "UInt")  ; dwLength
    
    if !DllCall("GlobalMemoryStatusEx", "Ptr", &memStatus)
        return "N/A"
    
    totalPhys := NumGet(memStatus, 8, "Int64")
    availPhys := NumGet(memStatus, 16, "Int64")
    
    if (totalPhys > 0)
        ramUsage := Round((totalPhys - availPhys) * 100.0 / totalPhys, 1)
    else
        ramUsage := 0
    
    return ramUsage
}
; ==============================================================================
; [보조 함수] 텔레그램 유니코드(\uXXXX)를 한글로 변환 (eval 오류 해결판)
UnEscapeUnicode(str) {
    if (str = "")
        return ""
    
    pos := 1
    while (pos := RegExMatch(str, "\\u([0-9a-fA-F]{4})", m, pos)) {
        ; \uXXXX 형태를 찾아서 실제 문자로 변환
        char := Chr("0x" . m1)
        str := StrReplace(str, m, char)
        pos += 1
    }
    ; 텔레그램 특유의 이스케이프 문자들 처리
    str := StrReplace(str, "\/", "/")
    str := StrReplace(str, "\n", "`n")
    str := StrReplace(str, "\""", """")
    
    return str
}

InvokeLabelNow(labelName) {
    SetTimer, %labelName%, -1
    Sleep, -1
}

PauseMonitorTimer() {
    SetTimer, MonitorRoutine, Off
}

ResumeMonitorTimer(interval := 3000) {
    SetTimer, MonitorRoutine, %interval%
}

SetPictureBitmap(ctrlHwnd, hBitmap) {
    ; STM_SETIMAGE (0x172), IMAGE_BITMAP (0)
    SendMessage, 0x172, 0, hBitmap,, ahk_id %ctrlHwnd%
    return ErrorLevel
}

CleanupUiResources() {
    global BtnToggleBitmap
    if (BtnToggleBitmap) {
        DeleteObject(BtnToggleBitmap)
        BtnToggleBitmap := 0
    }
}
; --------------------------------------------------------------종료------------------------------------
GuiClose:
MainGuiClose:
    CleanupUiResources()
    ; [추가] 모든 타이머 중지
    PauseMonitorTimer()
    SetTimer, CheckTeleCommand, Off  ; [수정] TeleControl → CheckTeleCommand
    
    if (pToken) {
        Gdip_Shutdown(pToken)
        pToken := 0
    }
    
    ; 메인 창 위치 저장
    WinGetPos, wX, wY,,, ahk_id %MainHwnd%
    if (wX != "" && wY != "") {
        IniWrite, %wX%, %MainIni%, Settings, MainX
        IniWrite, %wY%, %MainIni%, Settings, MainY
    }
    
    ExitApp

; --------------------------------------------------------------종료------------------------------------

; [메모리 최적화 함수]
EmptyMem() {
    return DllCall("psapi.dll\EmptyWorkingSet", "Ptr", -1)
}

GetScriptMem() {
    static PMC
    ; 64비트면 구조체 크기 72, 32비트면 40
    Size := (A_PtrSize == 8) ? 72 : 40
    
    if !VarSetCapacity(PMC)
        VarSetCapacity(PMC, Size, 0)
    
    Process, Exist
    hProcess := DllCall("OpenProcess", "UInt", 0x0400|0x0010, "Int", 0, "UInt", ErrorLevel, "Ptr")
    
    if (hProcess) {
        DllCall("psapi.dll\GetProcessMemoryInfo", "Ptr", hProcess, "Ptr", &PMC, "UInt", Size)
        DllCall("CloseHandle", "Ptr", hProcess)
        
        ; 64비트면 오프셋 16, 32비트면 오프셋 12
        Offset := (A_PtrSize == 8) ? 16 : 12
        MemUsage := NumGet(PMC, Offset, "UPtr")
        
        return Round(MemUsage / 1024 / 1024, 1)
    }
    return 0
}

; ==============================================================================
; [최종 수정] 부모창 위치 추적 및 GUI 레이아웃 최적화 버전

OpenCommonImgSet:
    Gui, ComSet:Destroy 

    ParentHwnd := WinExist("이미지 관리") ? WinExist("이미지 관리") : MainHwnd
    WinGetPos, pX, pY, pW, pH, ahk_id %ParentHwnd%

    ; 부모창의 정중앙 근처에 뜨도록 계산 (살짝 오른쪽 아래로 오프셋)
    cX := pX + 40
    cY := pY + 40
    
    ; 3. GUI 생성 및 설정
    Gui, ComSet:New, +Owner%ParentHwnd% ; 부모창에 종속시킴
    Gui, ComSet:Color, FFFFFF
    Gui, ComSet:Font, s9, Malgun Gothic
    
    ; 데이터 읽기
    IniRead, valLvl, %CommonIni%, CommonImages, LevelUp_Text, %Default_LevelUp%
    IniRead, valLvlX, %CommonIni%, CommonImages, LevelUp_ClickX, 0
    IniRead, valLvlY, %CommonIni%, CommonImages, LevelUp_ClickY, 0
    IniRead, valRst, %CommonIni%, CommonImages, Restart_Text, %Default_Restart%
    IniRead, valBoot, %CommonIni%, CommonImages, Boot_Text, |<부팅완료>
    IniRead, valEqp, %CommonIni%, CommonImages, Equip_Text, |<장비분해>
    IniRead, valEqpInt, %CommonIni%, CommonImages, Equip_Interval, 60
    
    Gui, ComSet:Font, bold s11 cBlue
    Gui, ComSet:Add, Text, x20 y15 w1060 h25 Center, ⚙️ 공용 루틴 및 이미지 통합 설정
    Gui, ComSet:Font, norm s9 cDefault
    
    ; --- [좌측 칼럼: 시스템 설정] ---
    Gui, ComSet:Add, GroupBox, x20 y50 w520 h160, 1. 레벨업 감지 (Level Up)
    Gui, ComSet:Add, Text, x35 y75, 이미지 코드:
    Gui, ComSet:Add, Edit, x35 y95 w490 h50 vEditLvlStr, %valLvl%
    Gui, ComSet:Add, Text, x35 y160, 팝업 닫기 좌표:
    Gui, ComSet:Add, Edit, x120 y157 w60 h25 vEditLvlX ReadOnly Center, %valLvlX%
    Gui, ComSet:Add, Edit, x185 y157 w60 h25 vEditLvlY ReadOnly Center, %valLvlY%
    Gui, ComSet:Add, Button, x260 y154 w265 h30 gSetCommonCoords_Lvl, 🎯 좌표 설정
    
    Gui, ComSet:Add, GroupBox, x20 y220 w520 h110, 2. 연결끊김/잠룡이미지
    Gui, ComSet:Add, Text, x35 y245, 감지 이미지 코드:
    Gui, ComSet:Add, Edit, x35 y265 w490 h50 vEditRstStr, %valRst%
    
    Gui, ComSet:Add, GroupBox, x20 y340 w520 h110, 3. 재실행 후 부팅 대기
    Gui, ComSet:Add, Text, x35 y365, 부팅 완료 이미지:
    Gui, ComSet:Add, Edit, x35 y385 w490 h50 vEditBootStr, %valBoot%
    
    ; --- [우측 칼럼: 장비 분해] ---
    Gui, ComSet:Add, GroupBox, x560 y50 w520 h400, 4. 장비 분해 루틴
    
    ; 진입 이미지 입력칸 대폭 확장
    Gui, ComSet:Add, Text, x575 y80, 🟢빨간가방 이미지:
    Gui, ComSet:Add, Edit, x575 y100 w490 h60 vEditEqpStr, %valEqp% 
        
    Gui, ComSet:Add, ListView, x575 y205 w490 h175 vEqpList gEqpListEvent Grid -Multi, No|단계 이름(설명)|X|Y|대기(ms)
    LV_ModifyCol(1, 40), LV_ModifyCol(2, 230), LV_ModifyCol(3, 55), LV_ModifyCol(4, 55), LV_ModifyCol(5, 80)
    
    ; 버튼들 위치 최적화
    Gui, ComSet:Add, Button, x575 y390 w155 h45 gRecordCommonEquip cRed, 🔴 단계 녹화 시작
    Gui, ComSet:Add, Button, x743 y390 w155 h45 gTestCommonEquip, ▶ 테스트 실행
    Gui, ComSet:Add, Button, x910 y390 w155 h45 gDeleteCommonStep, 🗑️ 선택 단계 삭제

    ; --- [하단 설명 및 저장 영역] ---
    ; 요청하신 대로 선 그어놓은 남는 공간에 설명을 배치했습니다.
    Gui, ComSet:Font, s9 c777777
    Gui, ComSet:Add, Text, x20 y465 w1060 h30 Center, ※ 리스트뷰를 더블클릭하여 상세 수정이 가능합니다. 녹화 종료는 [스페이스바]를 누르세요.
    Gui, ComSet:Font, s9 cDefault
    
    Gui, ComSet:Add, Button, x20 y500 w1060 h60 gSaveCommonImgSettings Default, 💾 모든 설정 저장 및 즉시 적용
    
    LoadCommonEquipList()
    
    ; 4. [좌표 적용] 계산된 부모창 근처 좌표로 창을 띄웁니다.
    Gui, ComSet:Show, x%cX% y%cY% w1100 h580, 공용 이벤트 및 장비분해 설정
return

; ==============================================================================
; [장비 분해] 리스트뷰 이벤트 (더블클릭 시 수정)

EqpListEvent:
    if (A_GuiEvent == "DoubleClick") {
        Gui, ComSet:Default
        row := A_EventInfo
        if (row > 0) {
            LV_GetText(stepNum, row, 1)
            LV_GetText(stepName, row, 2)   
            LV_GetText(oldDelay, row, 5)
            
            MsgBox, 3, 수정 선택, [%stepName%] 수정 모드입니다.`n`n[예] : 좌표 재설정 (좌클릭)`n[아니오] : 딜레이/이름 수정`n[취소] : 취소
            IfMsgBox, Yes ; 좌표 수정
            {
                MsgBox, 64, 좌표 수정, 게임 창을 활성화하고 새로운 위치를 클릭하세요.
                
                ; 창 찾기 및 클릭 대기
                Loop {
                    if GetKeyState("LButton", "P") {
                        MouseGetPos, , , targetHwnd
                        WinActivate, ahk_id %targetHwnd%
                        break
                    }
                    Sleep, 50
                }
                
                ; 좌표 픽킹
                CoordMode, Mouse, Client
                Loop {
                    MouseGetPos, mX, mY
                    PostClick(targetHwnd, mX, mY)
                    ToolTip, [수정중] X:%mX% Y:%mY%
                    
                    if GetKeyState("LButton", "P")
                        break
                    Sleep, 100
                }
                KeyWait, LButton
                ToolTip
                
                ; INI 저장 및 리스트 갱신
                IniWrite, %mX%, %CommonIni%, CommonEquipRoutine, Step%stepNum%_X
                IniWrite, %mY%, %CommonIni%, CommonEquipRoutine, Step%stepNum%_Y
                MsgBox, 64, 완료, 좌표가 수정되었습니다.
                LoadCommonEquipList()
            }
            IfMsgBox, No ; 딜레이/이름 수정
            {
                InputBox, newName, 이름 수정, 단계 이름, , 250, 130, , , , , %stepName%
                InputBox, newDelay, 딜레이 수정, 딜레이(ms), , 250, 130, , , , , %oldDelay%
                
                if (newName != "" && newDelay != "") {
                    IniWrite, %newName%, %CommonIni%, CommonEquipRoutine, Step%stepNum%_Name
                    IniWrite, %newDelay%, %CommonIni%, CommonEquipRoutine, Step%stepNum%_Delay
                    LoadCommonEquipList()
                }
            }
        }
    }
return


; ==============================================================================
; [장비 분해] 단계 삭제 (자동 정렬 포함)
; ==============================================================================
DeleteCommonStep:
    DeleteCommonStepImpl()
return

DeleteCommonStepImpl() {
    global CommonIni
    Gui, ComSet:Default
    row := LV_GetNext(0, "F")
    if (row == 0) {
        MsgBox, 48, 알림, 삭제할 단계를 선택해주세요.
        return
    }
    
    LV_GetText(delIdx, row, 1) ; 삭제할 번호
    MsgBox, 36, 확인, 정말 [%delIdx%번] 단계를 삭제하시겠습니까?
    IfMsgBox, No
        return
        
    ; 1. 데이터를 메모리로 싹 가져옴
    IniRead, totalCount, %CommonIni%, CommonEquipRoutine, Count, 0
    TempData := []
    
    Loop, %totalCount% {
        if (A_Index == delIdx) ; 삭제할 놈은 건너뜀
            continue
            
        IniRead, x, %CommonIni%, CommonEquipRoutine, Step%A_Index%_X
        IniRead, y, %CommonIni%, CommonEquipRoutine, Step%A_Index%_Y
        IniRead, d, %CommonIni%, CommonEquipRoutine, Step%A_Index%_Delay
        IniRead, n, %CommonIni%, CommonEquipRoutine, Step%A_Index%_Name
        
        TempData.Push({x:x, y:y, d:d, n:n})
    }
    
    ; 2. 섹션 날리고 새로 씀 (재정렬)
    IniDelete, %CommonIni%, CommonEquipRoutine
    
    For i, item in TempData {
        IniWrite, % item.x, %CommonIni%, CommonEquipRoutine, Step%i%_X
        IniWrite, % item.y, %CommonIni%, CommonEquipRoutine, Step%i%_Y
        IniWrite, % item.d, %CommonIni%, CommonEquipRoutine, Step%i%_Delay
        IniWrite, % item.n, %CommonIni%, CommonEquipRoutine, Step%i%_Name
    }
    IniWrite, % TempData.MaxIndex(), %CommonIni%, CommonEquipRoutine, Count
    
    MsgBox, 64, 완료, 삭제 및 재정렬 완료.
    LoadCommonEquipList()
}


; [수정됨] 공용 루틴 리스트 불러오기
LoadCommonEquipList() {
    global CommonIni ; 
    
    Gui, ComSet:Default
    Gui, ComSet:ListView, EqpList
    LV_Delete()
    
    IniRead, count, %CommonIni%, CommonEquipRoutine, Count, 0
    Loop, %count% {
        IniRead, x, %CommonIni%, CommonEquipRoutine, Step%A_Index%_X
        IniRead, y, %CommonIni%, CommonEquipRoutine, Step%A_Index%_Y
        IniRead, d, %CommonIni%, CommonEquipRoutine, Step%A_Index%_Delay
        IniRead, n, %CommonIni%, CommonEquipRoutine, Step%A_Index%_Name, 단계 %A_Index%
        LV_Add("", A_Index, n, x, y, d)
    }
}



; [버튼] 레벨업 좌표 설정 (단일 클릭)
SetCommonCoords_Lvl:
    Gui, ComSet:Hide
    MsgBox, 64, 좌표 설정, 레벨업 팝업의 [닫기 버튼] 위치를 클릭하세요.
    
    Loop {
        if GetKeyState("LButton", "P") {
            MouseGetPos, , , targetHwnd
            WinActivate, ahk_id %targetHwnd%
            break
        }
        Sleep, 50
    }
    
    CoordMode, Mouse, Client
    Loop {
        MouseGetPos, mX, mY
        PostClick(targetHwnd, mX, mY) ; 빨간점 보여주기
        ToolTip, [좌표 설정] X:%mX% Y:%mY%
        
        if GetKeyState("LButton", "P")
            break
        Sleep, 100
    }
    KeyWait, LButton
    ToolTip
    
    Gui, ComSet:Show
    GuiControl, ComSet:, EditLvlX, %mX%
    GuiControl, ComSet:, EditLvlY, %mY%
    
    CoordMode, Mouse, Screen
return




; --- [공용] 좌표 피커 (레벨업용 단순 좌표) ---
CommonCoordPicker:
    Loop {
        if GetKeyState("LButton", "P") {
            MouseGetPos, , , targetHwnd
            WinActivate, ahk_id %targetHwnd%
            break
        }
        Sleep, 50
    }
    CoordMode, Mouse, Client
    Loop {
        MouseGetPos, mX, mY
        ToolTip, [좌표 설정]`n게임내부: %mX%`, %mY%`n좌클릭하여 확정
        if GetKeyState("LButton", "P")
            break
        Sleep, 50
    }
    KeyWait, LButton
    ToolTip
    MouseGetPos, PickX, PickY
    CoordMode, Mouse, Screen
return

; [버튼] 공용 설정 저장 (전체 저장)
SaveCommonImgSettings:
    Gui, ComSet:Submit
    
    ; 레벨업
    IniWrite, %EditLvlStr%, %CommonIni%, CommonImages, LevelUp_Text
    IniWrite, %EditLvlX%, %CommonIni%, CommonImages, LevelUp_ClickX
    IniWrite, %EditLvlY%, %CommonIni%, CommonImages, LevelUp_ClickY
    
    ; 재실행 & 부팅 완료
    IniWrite, %EditRstStr%, %CommonIni%, CommonImages, Restart_Text
    IniWrite, %EditBootStr%, %CommonIni%, CommonImages, Boot_Text ; [추가됨]
    
    ; 장비분해 (이미지 & 주기)
    IniWrite, %EditEqpStr%, %CommonIni%, CommonImages, Equip_Text
    IniWrite, %EditEqpInt%, %CommonIni%, CommonImages, Equip_Interval
    
    MsgBox, 64, 완료, 모든 공용 설정이 저장되었습니다.
    Gui, ComSet:Destroy
return



RecordCommonEquip:
    Gui, ComSet:Submit, NoHide
    
    MsgBox, 64, 녹화 시작, 1. [확인] 누르고`n2. 게임 창을 [클릭]하면`n3. 바로 녹화가 시작됩니다.
    
    KeyWait, LButton, D 
    
    ; 2. 클릭한 곳의 창 ID 가져오기
    MouseGetPos, , , targetHwnd
    WinActivate, ahk_id %targetHwnd%
   
    ; 3. 클릭 뗄 때까지 대기 (중복 방지)
    KeyWait, LButton
    
    ; 4. 바로 녹화 투입 (공통 녹화기로 통합)
    MasterRecorder(CommonIni, "CommonEquipRoutine", targetHwnd, "ComSet")
return


TestCommonEquip:
    Gui, ComSet:Submit, NoHide
    
    IniRead, searchImg, %CommonIni%, CommonImages, Equip_Text, |<장비분해>
    if (searchImg == "" || searchImg == "|<장비분해>") {
        MsgBox, 48, 오류, 먼저 [진입 이미지]를 설정해주세요.
        return
    }

    MsgBox, 64, 테스트 시작, 전체 화면에서 이미지를 찾습니다.`n(확인 누르면 시작)
    
    if (FindText(fX, fY, 0, 0, A_ScreenWidth, A_ScreenHeight, 0.1, 0.1, searchImg)) {
        foundHwnd := DllCall("WindowFromPoint", "Int64", fX | (fY << 32), "Ptr")
        mainHwnd := DllCall("GetAncestor", "Ptr", foundHwnd, "UInt", 2) 
        
        if (mainHwnd) {
            ; WinActivate, ahk_id %mainHwnd% ; (비활성 테스트라 활성화 제거함)
            WinGetTitle, title, ahk_id %mainHwnd%
            AddLog("▶ [테스트] 발견된 창: " . title)
            
            ExecuteCommonRoutine("CommonEquipRoutine", mainHwnd, "", true)
            
            MsgBox, 64, 완료, 테스트 완료.
        } else {
            MsgBox, 48, 오류, 창 ID를 가져오지 못했습니다.
        }
    } else {
        MsgBox, 48, 실패, 이미지를 찾을 수 없습니다.
    }
return


; ==============================================================================
; [단축키] 삭제(Delete) 키 연동 로직
; ==============================================================================
#IfWinActive 설정 - ; 개별 설정창 (제목이 '설정 - 클라이언트...' 로 시작)
Delete::
    ControlGetFocus, focusedControl, A
    ; SysListView321은 보통 첫 번째 리스트뷰(복구 루틴), 322는 두 번째(매크로)입니다.
    if (focusedControl == "SysListView321") {
        DeleteRecStepImpl()
    } else if (focusedControl == "SysListView322") {
        DeleteMacroImpl()
    }
return
#IfWinActive

#IfWinActive 공용 이벤트 및 장비분해 설정 ; 공용 설정창
Delete::
    DeleteCommonStepImpl()
return
#IfWinActive

; ==============================================================================
; [미니모드 설정 V22] 불필요한 사이즈 설정 삭제 -> 모니터 선택만 남김
; ==============================================================================
OpenMiniSetting:
    Gui, MiniSet:New, +AlwaysOnTop -Caption +ToolWindow +OwnerMain
    Gui, MiniSet:Color, White
    Gui, MiniSet:Font, s10 bold, Malgun Gothic
    
    Gui, MiniSet:Add, Text, x10 y15 w230 h20 Center, [미니모드 설정]
    
    Gui, MiniSet:Font, s9 norm
    
    ; 사이즈 설정 삭제됨 (Alt+G 자동 크기 사용)
    
    ; 모니터 선택
    Gui, MiniSet:Add, GroupBox, x10 y50 w230 h80, 이동할 모니터 선택
    
    ; 저장된 모니터 번호 읽기 (기본값 1)
    IniRead, CurMon, %CommonIni%, MiniMode, Monitor, 1
    
    Gui, MiniSet:Add, Text, x25 y80, 대상:
    Gui, MiniSet:Add, DropDownList, x80 y77 w100 vInputMonitor Choose%CurMon%, 1번 모니터|2번 모니터
    
    ; 버튼
    Gui, MiniSet:Add, Button, x30 y150 w80 h30 gSaveMiniSet, 💾 저장
    Gui, MiniSet:Add, Button, x140 y150 w80 h30 gCloseMiniSet, 취소
    
    Gui, MiniSet:Show, w250 h200, 설정
return

SaveMiniSet:
    Gui, MiniSet:Submit
    
    ; 드롭다운 선택값에서 숫자만 추출 (1번 모니터 -> 1)
    MonIndex := SubStr(InputMonitor, 1, 1)
    
    ; INI 저장 (모니터 번호만 저장하면 됨)
    IniWrite, %MonIndex%, %CommonIni%, MiniMode, Monitor
    
    MsgBox, 64, 저장 완료, 미니모드가 [%MonIndex%번 모니터]로 설정되었습니다.
    Gui, MiniSet:Destroy
return

CloseMiniSet:
    Gui, MiniSet:Destroy
return



; ==============================================================================
; [기능] 모니터 전체 이동 (1~4번 배치 유지 + 5번 지정 좌표 1080, 520)
; ==============================================================================
SwapMonitorSimple:
    ; 1. 기준 클라 확인
    if (!Clients[1].ID || !WinExist("ahk_id " . Clients[1].ID)) {
        MsgBox, 48, 오류, 1번 클라이언트가 켜져 있어야 기준을 잡습니다.
        return
    }

    ; 2. 모니터 정보 수집
    SysGet, Mon1, MonitorWorkArea, 1
    SysGet, Mon2, MonitorWorkArea, 2

    ; 3. 현재 1번 클라 위치로 '반대쪽 모니터'가 어딘지 판단
    WinGetPos, c1X, c1Y, c1W, c1H, % "ahk_id " . Clients[1].ID
    Center := c1X + (c1W / 2)
    
    ; [상황 A] 현재 1번 모니터에 있음 -> 목적지는 '2번 모니터'
    if (Center >= Mon1Left && Center <= Mon1Right) {
        OffsetX := Mon2Left - Mon1Left
        OffsetY := Mon2Top - Mon1Top
        
        ; 5번이 갈 목적지 좌표 (2번 모니터 기준)
        Target5_X := Mon2Left + 1080
        Target5_Y := Mon2Top + 520
        
        Msg := "1번 -> 2번 모니터로 이동"
    } 
    ; [상황 B] 현재 2번 모니터에 있음 -> 목적지는 '1번 모니터'
    else {
        OffsetX := Mon1Left - Mon2Left
        OffsetY := Mon1Top - Mon2Top
        
        ; 5번이 갈 목적지 좌표 (1번 모니터 기준)
        Target5_X := Mon1Left + 1080
        Target5_Y := Mon1Top + 520
        
        Msg := "2번 -> 1번 모니터로 이동"
    }
    
    AddLog(Msg)

    ; 4. [1번 ~ 4번] 기존 배치 그대로 이동 (Offset 적용)
    Loop, 4 {
        idx := A_Index
        TargetID := Clients[idx].ID
        
        if (TargetID && WinExist("ahk_id " . TargetID)) {
            WinGetPos, curX, curY, , , ahk_id %TargetID%
            WinMove, ahk_id %TargetID%, , curX + OffsetX, curY + OffsetY
        }
    }
    
    Sleep, 50

    ; 5. [5번 클라] 무조건 지정된 좌표(1080, 520)로 강제 이동
    TargetID := Clients[5].ID
    if (TargetID && WinExist("ahk_id " . TargetID)) {
        WinRestore, ahk_id %TargetID% ; 최소화 되어있으면 풀기
        
        ; 크기(W,H)는 건드리지 않고 위치(X,Y)만 이동
        WinMove, ahk_id %TargetID%, , %Target5_X%, %Target5_Y%
        
        ; 맨 앞으로 가져오기
        WinActivate, ahk_id %TargetID%
        AddLog("5번 클라 -> 좌표(" . Target5_X . ", " . Target5_Y . ") 고정 이동")
    }
    
    AddLog("🖥️모니터 이동 완료")
return



ProcessRecovery(idx, ReasonLog) {
    global Clients, Titles, BaseFolder, ClientInis, Monitoring, CommonIni, Telegram_Token, Telegram_chatid
    global LastAppRestartTime, LastMacroTime
    
    ; 1. 파일 및 설정 확인
    cFile := ClientInis[idx]
    TargetTitle := Titles[idx]
    
    IniRead, rCount, %cFile%, Recovery, Count, 0
    
    if (rCount <= 0) {
        IniRead, cCount, %CommonIni%, Recovery, Count, 0
        if (cCount > 0) {
            UseIni := CommonIni
            UseSection := "Recovery"
            LogPrefix := "(공용) "
            AddLog("⚠️ [" . TargetTitle . "] 개별 설정 없음 -> [공용 루틴] 적용", TargetTitle)
        } else {
            AddLog("❌ [" . TargetTitle . "] 복구 루틴 설정이 없습니다.", TargetTitle)
            return
        }
    } else {
        UseIni := cFile
        UseSection := "Recovery"
        LogPrefix := ""
    }

    ; 부팅 이미지 확인
    IniRead, BootImg, %CommonIni%, CommonImages, Boot_Text, %A_Space%
    if (BootImg == "" || BootImg == "ERROR" || BootImg == "|<부팅완료>") {
        AddLog("❌ [오류] '공용설정'에서 [부팅 완료 이미지]를 먼저 설정해주세요!", TargetTitle)
        return
    }

    WasMonitoring := Monitoring
    Monitoring := 1              
    PauseMonitorTimer()
    obj := Clients[idx]

    StartMsg := "🔄 [" . TargetTitle . "] " . ReasonLog . " 시작..."
    AddLog(StartMsg, TargetTitle)
    SendTele(StartMsg)
    
    ; 1. 기존 창 강제 종료
    TargetID := obj.ID
    if (TargetID && WinExist("ahk_id " . TargetID)) {
        WinClose, ahk_id %TargetID%
        Sleep, 500
        WinKill, ahk_id %TargetID%
        AddLog("  └ 기존 창 종료됨.", TargetTitle)
    }
    Sleep, 2000
    
    ; 2. 바로가기 실행
    FileNum := idx - 1
    SearchPattern := BaseFolder . "\#" . FileNum . "*.lnk"
    RunTarget := ""
    Loop, Files, %SearchPattern%
    {
         RunTarget := A_LoopFileFullPath
         break
    }
    if (RunTarget == "")
        RunTarget := BaseFolder . "\#" . FileNum . ".lnk"

    if FileExist(RunTarget) {
        Run, %RunTarget%
        AddLog("  └ 실행 파일 가동: " . RunTarget, TargetTitle)
    } else {
        FailMsg := "❌ [오류] 바로가기 파일이 없습니다: " . RunTarget
        AddLog(FailMsg, TargetTitle)
        SendTele(FailMsg)
        Monitoring := WasMonitoring
        if (Monitoring)
            ResumeMonitorTimer()
        return
    }
    
    ; 3. 창 뜰 때까지 대기
    WinWait, %TargetTitle%, , 60
    if (ErrorLevel) {
        FailMsg := "⚠️ [" . TargetTitle . "] 실행 실패: 60초 초과"
        AddLog(FailMsg, TargetTitle)
        SendTele(FailMsg)
        Monitoring := WasMonitoring
        if (Monitoring)
            ResumeMonitorTimer()
        return
    }
    
    ; 4. 새 ID 갱신
    WinGet, newID, ID, %TargetTitle%
    WinGet, newPID, PID, ahk_id %newID%
    Clients[idx] := {ID: newID, PID: newPID, Name: TargetTitle}
    
    ; 창 위치 파악 (검색 범위 제한용)
    WinGetPos, wX, wY, wW, wH, ahk_id %newID%
    
    ; (비활성 모드 유지 위해 Activate 제거함)
    Sleep, 1000 
    AddLog("  ✨새 창 감지됨. 부팅 대기 중...", TargetTitle)

    ; 5. 부팅 이미지 감지 (★수정됨: 해당 창 영역 안에서만 검색)
    ; 5. 부팅 이미지 감지 (위치 실시간 추적)
    IsBooted := false
    AddLog("⏳ 부팅 이미지 찾는 중...", TargetTitle)

    Loop, 60 { 
        ; [중요] 창 위치를 매번 다시 확인해야 합니다 (부팅 중 위치가 변하거나 최소화가 풀릴 수 있음)
        WinGetPos, wX, wY, wW, wH, ahk_id %newID%
        
        ; 1. 최소화 상태(-32000)면 검색하지 않고 대기
        if (wX < -20000 || wW < 100) {
            ; 최소화 상태면 살짝 복구 명령 (활성화는 안 시키고 크기만 복구)
            WinRestore, ahk_id %newID% 
            Sleep, 1000
            continue
        }

        ; 2. 창 내부 영역 검색
        ; FindText(X, Y, 시작X, 시작Y, 끝X, 끝Y, 오차, 오차, 텍스트)
        if (FindText(fX, fY, wX, wY, wX+wW, wY+wH, 0.1, 0.1, BootImg)) {
            AddLog("✅ 부팅 완료 이미지 확인됨!", TargetTitle)
            IsBooted := true
            break
        }
        
        Sleep, 1000 ; 1초마다 확인
    }
sleep, 3000
    
    if (!IsBooted) {
        AddLog("⚠️ 부팅 이미지를 찾지 못했으나 복구 루틴을 진행합니다.", TargetTitle)
    }

    ; 6. 복구 루틴 실행
    AddLog("  ▶ " . LogPrefix . "복구 프로세스 진입", TargetTitle)
    ExecuteRoutine(UseIni, UseSection, newID, 1) 
    AddLog("  ▶ 복구 프로세스 종료", TargetTitle)

; [변경 2] 복구가 성공(SUCCESS)했다면, 매크로 상태를 '연동(🟢)'으로 강제 변경합니다.
    if (recoveryResult == "SUCCESS") {
        WinGet, finalID, ID, ahk_id %newID%
        WinGet, finalPID, PID, ahk_id %newID%
        Clients[idx] := {ID: finalID, PID: finalPID, Name: TargetTitle}

        ; GUI 상태 표시를 [🟢연결]로 변경
        Gui, Main:Default
        Gui, Main:Font, s8 bold c00AA00
        GuiControl, Main:Font, Status%idx%
        GuiControl, Main:, Status%idx%, 🟢연결
        GuiControl, Main:+BackgroundFFFFFF, Status%idx%
        
        AddLog("🔄 [시스템] 복구 성공! 재연동되었습니다.", TargetTitle)
    }
    
    ; 7. 인증샷 전송 & 마무리
    Sleep, 1000 
    pBitmap := CaptureWindowBitmap(newID)
    if (pBitmap) {
        TempFile := BaseFolder . "\Temp_Recovery_" . idx . ".png"
        Gdip_SaveBitmapToFile(pBitmap, TempFile)
        Gdip_DisposeImage(pBitmap)
        CaptionMsg := "✅ [" . TargetTitle . "] " . ReasonLog . " 완료!"
        SendPhoto_Binary(Telegram_Token, Telegram_chatid, TempFile, CaptionMsg)
        FileDelete, %TempFile%
    } else {
        SendTele("✅ [" . TargetTitle . "] " . ReasonLog . " 완료! (캡처 실패)")
    }
    
    Monitoring := WasMonitoring
    if (Monitoring) {
        ResumeMonitorTimer()
        AddLog("  ▶ 감시 기능 재개됨", TargetTitle)
    }
    LastAppRestartTime[idx] := A_TickCount
    LastMacroTime[idx] := A_TickCount
}


; ==========================================================================
; [통합 함수] 만능 녹화기 
; 사용법: MasterRecorder(저장할INI, 섹션이름, 대상ID, 숨길GUI이름)
; ==========================================================================
MasterRecorder(TargetIni, SectionName, TargetID, GuiToHide) {
    global ; 전역 변수 접근
    
    WasMonitoring := Monitoring
    PauseMonitorTimer()
    if (!TargetID || !WinExist("ahk_id " . TargetID)) {
        MsgBox, 48, 오류, 녹화할 대상 창을 찾을 수 없습니다.
        if (WasMonitoring)
            ResumeMonitorTimer()
        return
    }

    if (GuiToHide != "")
        Gui, %GuiToHide%: Hide
    
    WinActivate, ahk_id %TargetID%
    CoordMode, Mouse, Client
    
    ; REC 오버레이
    Gui, RecOverlay: New, +AlwaysOnTop -Caption +ToolWindow +LastFound +E0x20
    Gui, RecOverlay: Color, 000000
    WinSet, Transparent, 200
    Gui, RecOverlay: Font, s20 bold cRed, Malgun Gothic
    Gui, RecOverlay: Add, Text, x10 y5 vRecText, ● REC 
    
    CenterW := 120, CenterH := 50
    cX_Pos := (A_ScreenWidth / 2) - (CenterW / 2)
    cY_Pos := 100 
    Gui, RecOverlay: Show, x%cX_Pos% y%cY_Pos% w%CenterW% h%CenterH% NoActivate
    
    TempSteps := [] 
    LastTick := A_TickCount
    StepCount := 0
    FlashFlag := 0
    
    try {
        Loop {
            ; [클릭 감지]
            if GetKeyState("LButton", "P") {
                StepCount++
                CurrentTick := A_TickCount
                MouseGetPos, mX_Pos, mY_Pos 
                
                ; 딜레이 계산
                TimeDiff := CurrentTick - LastTick
                ThisStepDelay := (TimeDiff < 100) ? 100 : TimeDiff
                if (StepCount == 1 && ThisStepDelay < 1000)
                    ThisStepDelay := 1000

                TempSteps.Push({x: mX_Pos, y: mY_Pos, d: ThisStepDelay, n: "단계 " . StepCount})
                
                LastTick := CurrentTick 
                
                ; [추가] 빨간 점 대신 소리로 피드백! (삑!)
                SoundBeep, 700, 50
                
                ToolTip, % "[ 녹화 중 : " StepCount " 단계 ]`n⏱️ 대기: " Round(ThisStepDelay/1000, 1) "초`n📍 좌표: " mX_Pos ", " mY_Pos
                KeyWait, LButton 
            }
            
            ; REC 깜빡임
            if (Mod(A_TickCount, 1000) < 500) {
                if (FlashFlag == 0) {
                    GuiControl, RecOverlay: Hide, RecText
                    FlashFlag := 1
                }
            } else {
                if (FlashFlag == 1) {
                    GuiControl, RecOverlay: Show, RecText
                    FlashFlag := 0
                }
            }
            
            if GetKeyState("Space", "P") {
                KeyWait, Space
                break
            }
            Sleep, 10 
        }
        
    } finally {
        Gui, RecOverlay: Destroy
        ToolTip 
        CoordMode, Mouse, Screen
        
        FinalStepCount := TempSteps.MaxIndex()
        
        if (FinalStepCount > 0) {
            IniDelete, %TargetIni%, %SectionName%
            Loop, %FinalStepCount% {
                item := TempSteps[A_Index]
                IniWrite, % item.x, %TargetIni%, %SectionName%, Step%A_Index%_X
                IniWrite, % item.y, %TargetIni%, %SectionName%, Step%A_Index%_Y
                IniWrite, % item.d, %TargetIni%, %SectionName%, Step%A_Index%_Delay
                IniWrite, % item.n, %TargetIni%, %SectionName%, Step%A_Index%_Name
            }
            IniWrite, %FinalStepCount%, %TargetIni%, %SectionName%, Count
            if (InStr(SectionName, "Macro_"))
                IniWrite, 60, %TargetIni%, %SectionName%, Interval
            
            MsgBox, 64, 완료, 총 %FinalStepCount% 단계 저장 완료!
        }
        
        TempSteps := ""
        
        if (GuiToHide != "") {
            Gui, %GuiToHide%: Show
            if (GuiToHide == "Set") {
                RefreshRecListView()
                RefreshMacroListView()
                LoadAllStatus()
            } else if (GuiToHide == "ComSet") {
                LoadCommonEquipList()
            }
        }

        if (WasMonitoring) {
            ResumeMonitorTimer()
            AddLog("녹화 종료: 감시 재개됨")
        }
    }
}
