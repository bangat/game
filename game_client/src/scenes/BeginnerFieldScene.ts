import Phaser from "phaser";

type FieldMonster = {
  root: Phaser.GameObjects.Container;
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
  private isAutoAttackEnabled = true;

  constructor() {
    super("BeginnerField");
  }

  create(): void {
    const { width, height } = this.scale;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.clearOverlays, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.clearOverlays, this);

    this.cameras.main.setBackgroundColor("#274a33");

    this.drawField(width, height);
    this.drawPlayer(width, height);
    this.createMonsters(width, height);
    this.createFieldHud(width, height);
    this.createSkillPad(width, height);
    this.createMenuColumn(width, height);
    this.createQuestBar(width, height);
    this.startAutoAttackLoop();
  }

  update(time: number): void {
    for (const monster of this.monsters) {
      monster.root.y += Math.sin(time * 0.002 + monster.idlePhase) * 0.08;
    }
  }

  private drawField(width: number, height: number): void {
    const tileSize = 64;
    for (let y = 0; y < Math.ceil(height / tileSize); y += 1) {
      for (let x = 0; x < Math.ceil(width / tileSize); x += 1) {
        const color = (x + y) % 2 === 0 ? 0x446e46 : 0x527c4f;
        this.add.rectangle(x * tileSize + tileSize * 0.5, y * tileSize + tileSize * 0.5, tileSize, tileSize, color, 1);
      }
    }

    this.add.rectangle(width * 0.75, height * 0.24, width * 0.2, height * 0.15, 0x3b6040, 1);
    this.add.rectangle(width * 0.7, height * 0.58, width * 0.18, height * 0.22, 0x35553b, 1);
    this.add.rectangle(width * 0.28, height * 0.33, width * 0.14, height * 0.12, 0x5d7e57, 1);

    this.add.text(width * 0.06, height * 0.08, "BEGINNER FIELD", {
      fontFamily: "Segoe UI",
      fontSize: "20px",
      color: "#f3fbf0"
    });
    this.add.text(width * 0.06, height * 0.12, "KIT-03 타일 + MON-01 슬라임 + VFX-01/02 검수용", {
      fontFamily: "Segoe UI",
      fontSize: "12px",
      color: "#d7efcf"
    });
  }

  private drawPlayer(width: number, height: number): void {
    const root = this.add.container(width * 0.38, height * 0.52);
    root.add(this.add.circle(0, 10, 20, 0x2b4369, 1));
    root.add(this.add.circle(0, -18, 14, 0xf0ccac, 1));
    root.add(this.add.rectangle(0, -28, 24, 8, 0x1a2535, 1));
    root.add(this.add.ellipse(0, 32, 48, 20, 0x000000, 0.18));
    root.add(this.add.text(-18, 44, "임시 플레이어", { fontFamily: "Segoe UI", fontSize: "11px", color: "#f4f7fb" }));
  }

  private createMonsters(width: number, height: number): void {
    const spawnPoints = [
      { x: width * 0.58, y: height * 0.42, color: 0x7ee264, name: "초보 슬라임" },
      { x: width * 0.68, y: height * 0.56, color: 0x95f171, name: "숲 슬라임" },
      { x: width * 0.55, y: height * 0.64, color: 0x65d75d, name: "젤리 슬라임" }
    ];

    this.monsters = spawnPoints.map((spawn, index) => {
      const root = this.add.container(spawn.x, spawn.y);
      root.add(this.add.ellipse(0, 20, 54, 18, 0x000000, 0.14));
      root.add(this.add.ellipse(0, 0, 48, 34, spawn.color, 1));
      root.add(this.add.circle(-8, -4, 4, 0x1b2c1a, 1));
      root.add(this.add.circle(8, -4, 4, 0x1b2c1a, 1));
      root.add(this.add.rectangle(0, 8, 18, 3, 0x40633f, 1));

      const hpBack = this.add.rectangle(0, -34, 48, 6, 0x16201a, 1).setOrigin(0.5);
      const hpBar = this.add.rectangle(-24, -34, 48, 6, 0x6bff8b, 1).setOrigin(0, 0.5);
      const label = this.add
        .text(0, -52, spawn.name, {
          fontFamily: "Segoe UI",
          fontSize: "11px",
          color: "#eef7eb"
        })
        .setOrigin(0.5);
      root.add(hpBack);
      root.add(hpBar);
      root.add(label);

      return {
        root,
        hpBar,
        label,
        hp: 100,
        maxHp: 100,
        name: spawn.name,
        idlePhase: index * 0.9
      };
    });
  }

  private createFieldHud(width: number, height: number): void {
    const top = document.createElement("div");
    top.className = "overlay-card overlay-card--field-top";
    top.innerHTML = `
      <div class="profile-chip profile-chip--compact">
        <div class="profile-chip__avatar">P</div>
        <div class="profile-chip__meta">
          <div class="profile-chip__zone">햇살 초원</div>
          <div class="profile-chip__name">Lv 7 / 전투력 377</div>
        </div>
      </div>
      <div class="field-meta">
        <span>자동사냥 ON</span>
        <span>오프라인 보상 대기 12m</span>
      </div>
    `;
    this.overlayNodes.push(top);
    this.add.dom(width * 0.22, height * 0.09, top);

    const combat = document.createElement("div");
    combat.className = "combat-card";
    combat.innerHTML = `
      <div class="combat-card__row">
        <span class="combat-card__label">전투 상태</span>
        <strong id="combat-status">자동 전투 진행중</strong>
      </div>
      <div class="combat-card__row">
        <span class="combat-card__label">현재 타깃</span>
        <strong id="combat-target">초보 슬라임</strong>
      </div>
      <div class="combat-card__row">
        <span class="combat-card__label">드랍 목표</span>
        <strong>스킬북 / 초급 검술</strong>
      </div>
    `;
    this.hudStatus = combat.querySelector("#combat-status") as HTMLElement;
    this.hudTarget = combat.querySelector("#combat-target") as HTMLElement;
    this.overlayNodes.push(combat);
    this.add.dom(width * 0.19, height * 0.24, combat);
  }

  private createSkillPad(width: number, height: number): void {
    const pad = document.createElement("div");
    pad.className = "skill-pad";
    pad.innerHTML = `
      <div class="skill-pad__left">
        <button class="skill-pad__mini">퀵</button>
      </div>
      <div class="skill-pad__right">
        <button class="skill-pad__skill">칼날베기</button>
        <button class="skill-pad__skill">중급 스킬</button>
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
      this.attackNearestMonster();
    });

    this.overlayNodes.push(pad);
    this.add.dom(width * 0.78, height * 0.86, pad);
  }

  private createMenuColumn(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "vertical-menu vertical-menu--field";
    node.innerHTML = `
      <button>메뉴</button>
      <button>가방</button>
      <button>퀘스트</button>
      <button>설정</button>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.93, height * 0.29, node);
  }

  private createQuestBar(width: number, height: number): void {
    const node = document.createElement("div");
    node.className = "quest-strip quest-strip--field";
    node.innerHTML = `
      <span class="quest-strip__label">메인 퀘스트</span>
      <strong>젤리 슬라임 5마리 처치</strong>
      <small>하단 대화형 퀘스트와 보상 표시는 다음 단계</small>
    `;
    this.overlayNodes.push(node);
    this.add.dom(width * 0.29, height * 0.8, node);

    const backButton = this.add
      .text(width * 0.12, height * 0.9, "객잔 복귀", {
        fontFamily: "Segoe UI",
        fontSize: "15px",
        color: "#102118",
        backgroundColor: "#9ce27f",
        padding: { left: 14, right: 14, top: 8, bottom: 8 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    backButton.on("pointerdown", () => {
      this.scene.start("Loading", {
        nextScene: "TavernHub",
        title: "Tavern Hub",
        subtitle: "초보 필드 전투를 정리하고 객잔으로 돌아갑니다.",
        tip: "다음 패치에서 하단 대화형 메인 퀘스트와 객잔 상점 패널을 연결합니다.",
        accent: 0xf4b24f
      });
    });
  }

  private startAutoAttackLoop(): void {
    this.autoAttackEvent = this.time.addEvent({
      delay: 900,
      loop: true,
      callback: () => {
        if (!this.isAutoAttackEnabled) {
          return;
        }
        this.attackNearestMonster();
      }
    });
  }

  private attackNearestMonster(): void {
    const livingMonster = this.monsters.find((monster) => monster.hp > 0);
    if (!livingMonster) {
      if (this.hudStatus) {
        this.hudStatus.textContent = "모든 몬스터 정리 완료";
      }
      if (this.hudTarget) {
        this.hudTarget.textContent = "타깃 없음";
      }
      return;
    }

    const damage = Phaser.Math.Between(18, 34);
    livingMonster.hp = Math.max(0, livingMonster.hp - damage);
    livingMonster.hpBar.width = 48 * (livingMonster.hp / livingMonster.maxHp);

    if (this.hudTarget) {
      this.hudTarget.textContent = livingMonster.name;
    }

    this.showDamageText(livingMonster.root.x, livingMonster.root.y - 44, damage, livingMonster.hp === 0);
    this.flashMonster(livingMonster.root);

    if (livingMonster.hp === 0) {
      livingMonster.label.setText(`${livingMonster.name} 처치`);
      livingMonster.hpBar.setFillStyle(0xf4b44a, 1);
      if (this.hudStatus) {
        this.hudStatus.textContent = "드랍 확인 중";
      }
      this.time.delayedCall(320, () => {
        livingMonster.root.setAlpha(0.35);
      });
    } else if (this.hudStatus) {
      this.hudStatus.textContent = "자동 전투 진행중";
    }
  }

  private flashMonster(target: Phaser.GameObjects.Container): void {
    this.cameras.main.shake(70, 0.0012);
    this.tweens.add({
      targets: target,
      alpha: 0.45,
      yoyo: true,
      duration: 70,
      repeat: 1
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
      duration: 540,
      ease: "Cubic.Out",
      onComplete: () => {
        label.destroy();
      }
    });
  }

  private clearOverlays(): void {
    this.overlayNodes.forEach((node) => node.remove());
    this.overlayNodes = [];
    this.autoAttackEvent?.remove();
  }
}
