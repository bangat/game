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
    worldSprites: {
        players: {
            warrior: {
                src: '/client/assets/skins/dark-fantasy/characters/warrior.png',
                crop: { x: 560, y: 170, w: 480, h: 740 },
                height: 3.9,
                keyColor: [49, 63, 74],
                tolerance: 52
            },
            mage: {
                src: '/client/assets/skins/dark-fantasy/characters/mage.png',
                crop: { x: 50, y: 150, w: 470, h: 760 },
                height: 3.9,
                keyColor: [49, 63, 74],
                tolerance: 52
            },
            ranger: {
                src: '/client/assets/skins/dark-fantasy/characters/warrior.png',
                crop: { x: 40, y: 170, w: 470, h: 740 },
                height: 3.9,
                keyColor: [49, 63, 74],
                tolerance: 52
            }
        },
        enemies: {
            slime: {
                src: '/client/assets/skins/dark-fantasy/enemies/field-goblin.png',
                crop: { x: 40, y: 130, w: 520, h: 760 },
                height: 3.5,
                keyColor: [49, 63, 74],
                tolerance: 52
            },
            wolf: {
                src: '/client/assets/skins/dark-fantasy/enemies/field-goblin.png',
                crop: { x: 590, y: 120, w: 600, h: 780 },
                height: 3.8,
                keyColor: [49, 63, 74],
                tolerance: 52
            },
            wisp: {
                src: '/client/assets/skins/dark-fantasy/enemies/field-boss.png',
                crop: { x: 1200, y: 110, w: 520, h: 820 },
                height: 4.1,
                keyColor: [49, 63, 74],
                tolerance: 52
            },
            colossus: {
                src: '/client/assets/skins/dark-fantasy/enemies/elemental-boss.png',
                crop: { x: 580, y: 110, w: 650, h: 850 },
                height: 5.4,
                keyColor: [49, 63, 74],
                tolerance: 52
            }
        }
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
