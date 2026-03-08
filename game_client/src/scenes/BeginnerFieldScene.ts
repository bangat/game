import Phaser from "phaser";
import { gameState, getSelectedHeroClass } from "../state/gameState";
import { backgroundTextures, enemyVisual, heroVisuals } from "../state/visuals";

type FieldMonster = {
  id: string;
  root: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  hp: number;
  maxHp: number;
  name: string;
  idlePhase: number;
};

export class BeginnerFieldScene extends Phaser.Scene {
  private overlayNodes: HTMLElement[] = [];
  private monsters: FieldMonster[] = [];
  private autoAttackEvent?: Phaser.Time.TimerEvent;
  private hudStatus?: HTMLElement;
  private hudTarget?: HTMLElement;
  private autoButton?: HTMLButtonElement;
  private playerRoot?: Phaser.GameObjects.Container;
  private playerSprite?: Phaser.GameObjects.Image;
  private playerLabel?: Phaser.GameObjects.Text;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd?: { [key: string]: Phaser.Input.Keyboard.Key };
  private joystickBase?: Phaser.GameObjects.Arc;
  private joystickStick?: Phaser.GameObjects.Arc;
  private joystickVector = new Phaser.Math.Vector2(0, 0);
  private joystickPointerId?: number;
  private isAutoAttackEnabled = true;
  private worldSize = { width: 1280, height: 820 };
  private stepTime = 0;

  constructor() {
    super("BeginnerField");
  }

  create(): void {
    const { width, height } = this.scale;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.clearOverlays, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.clearOverlays, this);

    this.cameras.main.setBackgroundColor("#274a33");
    this.cameras.main.setBounds(0, 0, this.worldSize.width, this.worldSize.height);

    this.drawField();
    this.drawPlayer();
    this.createMonsters();
    this.createCompactHud(width, height);
    this.createSkillPad(width, height);
    this.createRightMenu(width, height);
    this.createQuestBar(width, height);
    this.createJoystick(width, height);
    this.registerInput();
    this.startAutoAttackLoop();
  }

  update(time: number, delta: number): void {
    this.updatePlayer(delta);
    this.updatePlayerLabel();
    for (const monster of this.monsters) {
      monster.root.y += Math.sin(time * 0.002 + monster.idlePhase) * 0.06;
    }
  }

  private drawField(): void {
    const { width, height } = this.worldSize;
    this.add.image(width * 0.5, height * 0.5, backgroundTextures.field).setDisplaySize(width, height);
    this.add.rectangle(width * 0.5, height * 0.5, width, height, 0x17311d, 0.34);

    this.add.rectangle(width * 0.72, height * 0.26, width * 0.18, height * 0.16, 0x406244, 0.66);
    this.add.rectangle(width * 0.28, height * 0.34, width * 0.16, height * 0.12, 0x4e7852, 0.7);
    this.add.rectangle(width * 0.64, height * 0.62, width * 0.15, height * 0.16, 0x35553b, 0.72);

    this.add.text(88, 72, "BEGINNER FIELD", {
      fontFamily: "Segoe UI",
      fontSize: "20px",
      color: "#f5fbf5"
    }).setScrollFactor(0);
  }

  private drawPlayer(): void {
    const selected = getSelectedHeroClass();
    const visual = heroVisuals[selected.id];
    const root = this.add.container(540, 500);
    const shadow = this.add.ellipse(0, 46, 44, 16, 0x000000, 0.22);
    const sprite = this.add.image(0, 0, visual.texture);
    sprite.setCrop(visual.crop.x, visual.crop.y, visual.crop.width, visual.crop.height);
    sprite.setScale(visual.scale);
    root.add(shadow);
    root.add(sprite);

    this.playerRoot = root;
    this.playerSprite = sprite;
    this.playerLabel = this.add.text(root.x - 30, root.y + 54, gameState.nickname, {
      fontFamily: "Segoe UI",
      fontSize: "11px",
      color: "#f4f7fb"
    });
    this.cameras.main.startFollow(root, true, 0.08, 0.08);
  }

  private createMonsters(): void {
    const points = [
      { x: 760, y: 360, name: "초보 고블린" },
      { x: 860, y: 460, name: "숲 고블린" },
      { x: 680, y: 540, name: "젤리 슬라임" }
    ];

    this.monsters = points.map((point, index) => {
      const root = this.add.container(point.x, point.y);
      const shadow = this.add.ellipse(0, 42, 40, 16, 0x000000, 0.18);
      const sprite = this.add.image(0, 0, enemyVisual.texture);
      sprite.setCrop(enemyVisual.crop.x, enemyVisual.crop.y, enemyVisual.crop.width, enemyVisual.crop.height);
      sprite.setScale(enemyVisual.scale);
      const hpBack = this.add.rectangle(0, -32, 56, 6, 0x16201a, 1).setOrigin(0.5);
      const hpBar = this.add.rectangle(-28, -32, 56, 6, 0x72ff8e, 1).setOrigin(0, 0.5);
      const label = this.add
        .text(0, -50, point.name, {
          fontFamily: "Segoe UI",
          fontSize: "11px",
          color: "#f1f7ee"
        })
        .setOrigin(0.5);
      root.add([shadow, sprite, hpBack, hpBar, label]);
      return {
        id: `mob-${index + 1}`,
        root,
        sprite,
        hpBar,
        label,
        hp: 100,
        maxHp: 100,
        name: point.name,
        idlePhase: index * 0.7
      };
    });
  }

  private createCompactHud(width: number, height: number): void {
    const selected = getSelectedHeroClass();
    const node = document.createElement("div");
    node.className = "mini-hud mini-hud--field";
    node.innerHTML = `
      <div class="mini-hud__profile">
        <div class="mini-hud__avatar">${selected.label[0]}</div>
        <div>
          <div class="mini-hud__name">${gameState.nickname}</div>
          <div class="mini-hud__meta">${selected.label} / 전투력 377</div>
        </div>
      </div>
      <div class="mini-hud__bars">
        <div class="mini-bar"><span>HP</span><i style="width:82%"></i></div>
        <div class="mini-bar mini-bar--mana"><span>MP</span><i style="width:66%"></i></div>
      </div>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.14, height * 0.07, node).setScrollFactor(0);

    const status = document.createElement("div");
    status.className = "combat-status";
    status.innerHTML = `
      <span class="combat-status__eyebrow">전투 상태</span>
      <strong id="combat-status">자동 전투 진행중</strong>
      <small id="combat-target">타깃: 초보 고블린</small>
    `;
    this.hudStatus = status.querySelector("#combat-status") as HTMLElement;
    this.hudTarget = status.querySelector("#combat-target") as HTMLElement;
    this.overlayNodes.push(status);
    this.add.dom(width * 0.14, height * 0.18, status).setScrollFactor(0);
  }

  private createSkillPad(width: number, height: number): void {
    const selected = getSelectedHeroClass();
    const pad = document.createElement("div");
    pad.className = "skill-pad skill-pad--compact";
    pad.innerHTML = `
      <div class="skill-pad__right">
        <button class="skill-pad__skill">${selected.primarySkill}</button>
        <button class="skill-pad__skill skill-pad__skill--accent">AUTO</button>
        <button class="skill-pad__attack">공격</button>
      </div>
    `;

    this.autoButton = pad.querySelector(".skill-pad__skill--accent") as HTMLButtonElement;
    this.autoButton.addEventListener("click", () => {
      this.isAutoAttackEnabled = !this.isAutoAttackEnabled;
      this.autoButton!.textContent = this.isAutoAttackEnabled ? "AUTO" : "수동";
      this.autoButton!.classList.toggle("skill-pad__skill--off", !this.isAutoAttackEnabled);
      if (this.hudStatus) {
        this.hudStatus.textContent = this.isAutoAttackEnabled ? "자동 전투 진행중" : "수동 조작 대기";
      }
    });

    const attackButton = pad.querySelector(".skill-pad__attack") as HTMLButtonElement;
    attackButton.addEventListener("click", () => {
      this.performAttack();
    });

    this.overlayNodes.push(pad);
    this.add.dom(width * 0.82, height * 0.88, pad).setScrollFactor(0);
  }

  private createRightMenu(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "vertical-menu vertical-menu--thin";
    node.innerHTML = `
      <button>메뉴</button>
      <button>가방</button>
      <button>퀘스트</button>
      <button data-action="character">캐선</button>
    `;

    node.querySelector('[data-action="character"]')?.addEventListener("click", () => {
      this.scene.start("Loading", {
        nextScene: "CharacterSelect",
        title: "Character Select",
        subtitle: "캐릭터 슬롯과 직업을 다시 고릅니다.",
        tip: "옵션의 캐릭터 변경으로 이동했습니다.",
        accent: 0x6ea7ff
      });
    });

    this.overlayNodes.push(node);
    this.add.dom(width * 0.948, height * 0.34, node).setScrollFactor(0);
  }

  private createQuestBar(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "quest-strip quest-strip--compact quest-strip--bottom";
    node.innerHTML = `
      <span class="quest-strip__label">메인 퀘스트</span>
      <strong>초보 고블린 5마리 처치</strong>
      <small>하단 대화형 스토리 바는 다음 패치에서 연결</small>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.28, height * 0.88, node).setScrollFactor(0);
  }

  private createJoystick(width: number, height: number): void {
    this.joystickBase = this.add.circle(width * 0.12, height * 0.82, 54, 0xffffff, 0.12).setScrollFactor(0);
    this.joystickStick = this.add.circle(width * 0.12, height * 0.82, 24, 0xffffff, 0.26).setScrollFactor(0);
  }

  private registerInput(): void {
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.wasd = this.input.keyboard?.addKeys("W,A,S,D") as { [key: string]: Phaser.Input.Keyboard.Key };

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const { width, height } = this.scale;
      if (pointer.x < width * 0.38 && pointer.y > height * 0.52) {
        this.joystickPointerId = pointer.id;
        this.updateJoystick(pointer);
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.updateJoystick(pointer);
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.resetJoystick();
      }
    });
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickBase || !this.joystickStick) {
      return;
    }
    const center = new Phaser.Math.Vector2(this.joystickBase.x, this.joystickBase.y);
    const offset = new Phaser.Math.Vector2(pointer.x - center.x, pointer.y - center.y);
    const radius = 34;
    if (offset.length() > radius) {
      offset.normalize().scale(radius);
    }
    this.joystickStick.setPosition(center.x + offset.x, center.y + offset.y);
    this.joystickVector.set(offset.x / radius, offset.y / radius);
  }

  private resetJoystick(): void {
    if (this.joystickBase && this.joystickStick) {
      this.joystickStick.setPosition(this.joystickBase.x, this.joystickBase.y);
    }
    this.joystickVector.set(0, 0);
    this.joystickPointerId = undefined;
  }

  private startAutoAttackLoop(): void {
    this.autoAttackEvent = this.time.addEvent({
      delay: 850,
      loop: true,
      callback: () => {
        if (!this.isAutoAttackEnabled) {
          return;
        }
        this.performAttack();
      }
    });
  }

  private performAttack(): void {
    const player = this.playerRoot;
    if (!player) {
      return;
    }
    const target = this.findNearestMonster();
    if (!target) {
      if (this.hudStatus) {
        this.hudStatus.textContent = "사거리 안 몬스터 없음";
      }
      return;
    }

    const distance = Phaser.Math.Distance.Between(player.x, player.y, target.root.x, target.root.y);
    if (distance > 140) {
      if (this.hudStatus) {
        this.hudStatus.textContent = "근접 사거리 밖";
      }
      return;
    }

    this.animateAttack(target);
    this.attackMonster(target);
  }

  private attackMonster(monster: FieldMonster): void {
    const damage = Phaser.Math.Between(20, 34);
    monster.hp = Math.max(0, monster.hp - damage);
    monster.hpBar.width = 56 * (monster.hp / monster.maxHp);

    if (this.hudTarget) {
      this.hudTarget.textContent = `타깃: ${monster.name}`;
    }
    if (this.hudStatus) {
      this.hudStatus.textContent = "근접 베기 적중";
    }

    this.showDamageText(monster.root.x, monster.root.y - 46, damage, monster.hp === 0);
    this.flashMonster(monster);

    if (monster.hp === 0) {
      monster.label.setText(`${monster.name} 처치`);
      this.time.delayedCall(180, () => {
        monster.root.destroy();
        monster.label.destroy();
      });
      this.monsters = this.monsters.filter((item) => item.id !== monster.id);
    }
  }

  private findNearestMonster(): FieldMonster | undefined {
    const player = this.playerRoot;
    if (!player) {
      return undefined;
    }
    return this.monsters
      .filter((monster) => monster.hp > 0)
      .sort((a, b) => {
        const distanceA = Phaser.Math.Distance.Between(player.x, player.y, a.root.x, a.root.y);
        const distanceB = Phaser.Math.Distance.Between(player.x, player.y, b.root.x, b.root.y);
        return distanceA - distanceB;
      })[0];
  }

  private flashMonster(monster: FieldMonster): void {
    this.cameras.main.shake(70, 0.0011);
    this.tweens.add({
      targets: monster.sprite,
      alpha: 0.35,
      yoyo: true,
      duration: 70,
      repeat: 1
    });
  }

  private animateAttack(target: FieldMonster): void {
    const player = this.playerRoot;
    const playerSprite = this.playerSprite;
    if (!player || !playerSprite) {
      return;
    }

    const selected = getSelectedHeroClass();
    const direction = target.root.x >= player.x ? 1 : -1;
    playerSprite.setFlipX(direction < 0);

    const slash = this.add.arc(player.x + direction * 36, player.y + 4, 34, direction > 0 ? 220 : 20, direction > 0 ? 340 : 140, false, Phaser.Display.Color.HexStringToColor(selected.accentHex).color, 0.92);
    slash.setStrokeStyle(7, Phaser.Display.Color.HexStringToColor(selected.accentHex).color, 0.94);
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 160,
      onComplete: () => slash.destroy()
    });
  }

  private showDamageText(x: number, y: number, damage: number, isKill: boolean): void {
    const label = this.add
      .text(x, y, `${isKill ? "CRIT " : ""}${damage}`, {
        fontFamily: "Segoe UI",
        fontSize: isKill ? "22px" : "18px",
        color: isKill ? "#ffe17a" : "#f4fbff",
        stroke: "#12202e",
        strokeThickness: 4
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: label,
      y: y - 28,
      alpha: 0,
      duration: 520,
      ease: "Cubic.Out",
      onComplete: () => label.destroy()
    });
  }

  private updatePlayer(delta: number): void {
    const player = this.playerRoot;
    const sprite = this.playerSprite;
    if (!player || !sprite) {
      return;
    }

    const selected = getSelectedHeroClass();
    const dt = delta / 1000;
    const keyboardX =
      (this.cursors?.left.isDown || this.wasd?.A?.isDown ? -1 : 0) +
      (this.cursors?.right.isDown || this.wasd?.D?.isDown ? 1 : 0);
    const keyboardY =
      (this.cursors?.up.isDown || this.wasd?.W?.isDown ? -1 : 0) +
      (this.cursors?.down.isDown || this.wasd?.S?.isDown ? 1 : 0);

    const direction = new Phaser.Math.Vector2(keyboardX + this.joystickVector.x, keyboardY + this.joystickVector.y);
    if (direction.lengthSq() > 1) {
      direction.normalize();
    }

    player.x = Phaser.Math.Clamp(player.x + direction.x * selected.speed * dt, 96, this.worldSize.width - 96);
    player.y = Phaser.Math.Clamp(player.y + direction.y * selected.speed * dt, 120, this.worldSize.height - 96);

    if (direction.lengthSq() > 0.001) {
      this.stepTime += delta;
      sprite.setFlipX(direction.x < 0);
      sprite.y = Math.sin(this.stepTime * 0.02) * 4;
    } else {
      this.stepTime = 0;
      sprite.y = 0;
    }
  }

  private updatePlayerLabel(): void {
    if (!this.playerRoot || !this.playerLabel) {
      return;
    }
    this.playerLabel.setPosition(this.playerRoot.x - 28, this.playerRoot.y + 56);
  }

  private clearOverlays(): void {
    this.overlayNodes.forEach((node) => node.remove());
    this.overlayNodes = [];
    this.autoAttackEvent?.remove();
    this.playerRoot = undefined;
    this.playerSprite = undefined;
    this.playerLabel?.destroy();
    this.playerLabel = undefined;
    this.resetJoystick();
  }
}
