/**
 * [레벨업 중앙 관리 시스템]
 * * 1. 레벨업에 필요한 경험치 공식을 정의합니다.
 * (모든 게임이 이 공식을 따르게 됩니다.)
 */
function getExpNeededForLevel(level) {
    // 예: 1레벨 -> 2레벨 = 1 * 150 = 150 EXP 필요
    //     10레벨 -> 11레벨 = 10 * 150 = 1500 EXP 필요
    return level * 150;
}

/**
 * 2. 보상 적용 및 레벨업을 처리하는 핵심 함수입니다.
 * (모든 게임 파일이 이 함수를 호출하게 됩니다.)
 *
 * @param {object} db - Firebase database 참조 (e.g., firebase.database())
 * @param {string} uid - 레벨업할 유저의 UID
 * @param {number} expGained - 해당 게임에서 획득한 경험치
 * @param {number} pointsGained - 해당 게임에서 획득한 포인트
 */
function applyExpAndPoints(db, uid, expGained, pointsGained) {
    if (!uid || uid.startsWith('guest_')) {
        console.log("[레벨업.js] 게스트 유저이거나 UID가 없어 스킵합니다.");
        return;
    }

    const userProfileRef = db.ref('users').child(uid).child('profile');

    // 'profile' 노드에 트랜잭션을 실행하여 데이터 일관성을 보장합니다.
    userProfileRef.transaction(profile => {
        if (profile) {
            // 1. 포인트 지급
            profile.points = (profile.points || 0) + pointsGained;

            // 2. 레벨업 로직 시작
            let currentLevel = profile.level || 1;
            let currentExp = profile.exp || 0;

            // 3. (중요) 기존에 누적된 경험치를 가져옵니다.
            let expNeeded = getExpNeededForLevel(currentLevel); 

            currentExp += expGained; // 획득 경험치 추가

            let leveledUp = false;
            // 4. (중요) 누적 경험치가 레벨업에 도달했는지 확인 (여러 번 레벨업 가능)
            while (currentExp >= expNeeded) {
                currentLevel++; // 레벨업!
                currentExp -= expNeeded; // 필요 경험치 차감
                expNeeded = getExpNeededForLevel(currentLevel); // 다음 레벨 필요 경험치 재계산
                leveledUp = true;
            }

            // 5. 최종 값 업데이트
            profile.level = currentLevel;
            profile.exp = currentExp;

            if (leveledUp) {
                // 이 로그는 Firebase 트랜잭션을 실행한 클라이언트(게임)의 콘솔에 표시됩니다.
                console.log(`[레벨업.js] ${profile.nickname}님이 ${currentLevel}레벨 달성!`);
            }
        }
        return profile; // 수정된 프로필 반환
    });
}