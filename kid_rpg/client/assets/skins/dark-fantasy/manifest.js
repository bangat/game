export const activeSkin = {
    id: 'dark-fantasy',
    label: '잠룡 계열 다크 판타지 2.5D',
    backgrounds: {
        village: '/client/assets/skins/dark-fantasy/backgrounds/village-hub.jpg',
        meadow: '/client/assets/skins/dark-fantasy/backgrounds/village-hub.jpg',
        canyon: '/client/assets/skins/dark-fantasy/backgrounds/dark-field.jpg',
        shrine: '/client/assets/skins/dark-fantasy/backgrounds/boss-shrine.jpg',
        dungeon: '/client/assets/skins/dark-fantasy/backgrounds/cave-dungeon.jpg'
    },
    portraits: {
        warrior: '/client/assets/skins/dark-fantasy/characters/warrior.png',
        mage: '/client/assets/skins/dark-fantasy/characters/mage.png',
        ranger: '/client/assets/skins/dark-fantasy/characters/ranger.png'
    },
    enemies: {
        fieldMob: '/client/assets/skins/dark-fantasy/enemies/field-goblin.png',
        fieldBoss: '/client/assets/skins/dark-fantasy/enemies/field-boss.png',
        elementalBoss: '/client/assets/skins/dark-fantasy/enemies/elemental-boss.png'
    },
    ui: {
        hud: '/client/assets/skins/dark-fantasy/ui/main-hud.png',
        panel: '/client/assets/skins/dark-fantasy/ui/panel-frame.jpg',
        buttons: '/client/assets/skins/dark-fantasy/ui/mobile-buttons.png',
        icons: '/client/assets/skins/dark-fantasy/ui/icon-sheet.png'
    },
    audio: {
        reference: '/client/assets/skins/dark-fantasy/audio/rpg-audio-reference.png'
    },
    notes: {
        description: '원본 소스가 막히거나 교체가 필요할 때 이 매니페스트와 해당 파일만 바꾸면 되도록 분리한 활성 스킨이다.',
        approvedTone: '모바일 다크 판타지 ARPG, 잠룡 계열 톤'
    }
};

export function applySkinToRoot(root, skin = activeSkin) {
    if (!root) return;
    root.dataset.skin = skin.id;
    root.style.setProperty('--zone-bg-village', `url("${skin.backgrounds.village}")`);
    root.style.setProperty('--zone-bg-meadow', `url("${skin.backgrounds.meadow}")`);
    root.style.setProperty('--zone-bg-canyon', `url("${skin.backgrounds.canyon}")`);
    root.style.setProperty('--zone-bg-shrine', `url("${skin.backgrounds.shrine}")`);
    root.style.setProperty('--zone-bg-dungeon', `url("${skin.backgrounds.dungeon}")`);
    root.style.setProperty('--portrait-warrior', `url("${skin.portraits.warrior}")`);
    root.style.setProperty('--portrait-mage', `url("${skin.portraits.mage}")`);
    root.style.setProperty('--portrait-ranger', `url("${skin.portraits.ranger}")`);
    root.style.setProperty('--skin-hud-art', `url("${skin.ui.hud}")`);
    root.style.setProperty('--skin-panel-art', `url("${skin.ui.panel}")`);
    root.style.setProperty('--skin-button-art', `url("${skin.ui.buttons}")`);
    root.style.setProperty('--skin-icon-art', `url("${skin.ui.icons}")`);
}
