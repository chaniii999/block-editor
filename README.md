# SELab Block Editor — 과제 제출 요약

SELab Block Editor 미니 과제를 **fork한 뒤** [README.SELab.md](README.SELab.md) 기준으로 직교·레이아웃·연관 UI·선택 피드백을 개선한 내용입니다. (GitHub 저장소 메인 화면용)

- **SELab 과제 원문·8항목·As-Is:** [`README.SELab.md`](README.SELab.md)
- **마무리 스냅샷·미해결:** [`p_docs/07_마무리_및_알려진_한계.md`](p_docs/07_마무리_및_알려진_한계.md)
- **작업 이력:** [`work-log.md`](work-log.md)

```bash
npm install && npm run build
# VS Code F5 → tests/test-1.json 우클릭 → 블록 다이어그램 옆에 열기
```

*갱신: 2026-05-20 (1차 마무리)*

---

## 1. Fork 당시 README As-Is vs 지금

[`README.SELab.md`](README.SELab.md) **「현재 상태 (As-Is)」** (`test-1.json` 기준)에서 지적한 문제와, fork 이후 **1차 마무리** 시점의 대응입니다.

| README As-Is 문제 | fork 후 개선 (요약) | 대표 확인 |
|-------------------|---------------------|-----------|
| 노드가 세로로 과밀·계층 무시 | ELK + `bddLayout` spec **Y 밴드**, 형제 겹침 해소·마진 보정 | test-1 |
| 일부 노드 캔버스 이탈 | `fitDiagramToMargins` 등 후처리 | test-1 |
| 엣지 교차·무관 노드 관통 과다 | association **화면·ELK 제외**, spec **장애물 회피·N→S**, 차선 규칙 | test-1·test-4 |
| `Car`/`Truck` 등 루트에서 분리 | spec 밴드·부모 아래 형제 정렬 (`applySpecializationAroundParentLayout`) | test-1 |
| Vehicle→PowerTrain→Engine 계층 불가독 | containment nesting + spec 계층 분리 표현 | test-1 |

**아직 README 8항목을 전 테스트에서 완전 충족하지는 않습니다.** 회귀를 줄이기 위해 **광범위 레이아웃 실험은 중단**했고, 아래 §4의 **보류 항목**은 문서화만 했습니다.

---

## 2. README 8항목 — fork 후 달성도

| # | README 기준 | fork 후 | 비고 |
|---|-------------|---------|------|
| 1 | 선 교차 최소화 | **부분 개선** | association 미표시, spec 차선·뼈대 공유, 장애물 우회 |
| 2 | 노드 겹침 없음 | **부분 개선** | 형제 `resolveSiblingOverlaps`, ELK 간격·`displaySettings` |
| 3 | 엣지-노드 중첩 없음 | **부분 개선** | spec N→S·수직 진입 보정, 6점 우회(장애물 시) |
| 4 | 엣지 경로 단순성 | **부분 개선** | 동일 (source,target) spec 중첩 허용, 불필요 waypoint 축소 |
| 5 | 균일한 간격 | **부분 개선** | `bdd.*`·`elk.*` 튜닝, 헤더 `precomputeNodeSizes` |
| 6 | 계층적 배치 | **부분 개선** | containment 중첩 + spec 밴드; **nested spec**은 헤더 🔼 |
| 7 | 엣지 종단 명확성 | **부분 개선** | spec N·S 앵커, `setConnectionConstraint` |
| 8 | 대칭성 | **부분 개선** | 형제 가로 패킹·대칭; test-4 3영역 분리는 **미구현** |

**전제 (유지):** 상속·subclassification류는 mxGraph **spec 엣지**로 그림. 연관(association)은 **JSON `associations` + 🔗·모달**만, **선은 그리지 않음**.

---

## 3. fork 이후 추가·강화한 기능

### 3.1 직교 라우팅 (spec / 비-spec)

- **`specEdgeRouter.js`:** 마무리 시점 **N→S 고정** (`buildSpecPath`). 동적 4방향·형제 S 출구 실험은 **롤백**.
- 장애물·동일 열 2점 직선: **6점 우회**, N→S 면 관통 보정 (`fixSpecNsFourPointLastVerticalThroughObstacles` 등).
- **`MxEdgeBuilder.js`:** 비-spec 직교, **커스텀 규칙 1·3** (동일 쌍 spec 중첩 허용·근접 차선·N/S 앵커 분산).
- **`rerouteAllEdges`:** DFS **한 번** — spec `routeSpecEdge`, 비-spec `routeEdge`.

### 3.2 연관관계 (association)

- `BlockModelBuilder`: `association` → `associations[]`, `edges` 제외.
- **`MxAssociationLink.js`** + **`AssociationListModal.js`**: 노드 옆 🔗, 목록·방향·클릭 시 노드 선택.

### 3.3 BDD 레이아웃 (`bddLayout.js`, `layout.js`)

- spec **무방향 연결 요소**마다 Y 밴드 **한 번** (test-8 다이아몬드 중복 밴드 방지).
- test-9: 컨테이너 **안** spec 자식은 루트 밴드에서 제외 → 뷰포트 이탈 방지.
- **`layout.js` `precomputeNodeSizes`:** 헤더 폭 = 이름·스테레오타입 + 🔗 + 접기(33px).
- containment 스파인·형제 패킹·`syncRelativeFromAbsolute` 등 기존 파이프라인 유지·보강.

### 3.4 nested spec 크롬 (test-9) — **신규**

**조건:** 자식의 **직접 containment 부모** = spec **target** (예: `SCADA`⊂`GridController` + 동일 상속).

| 동작 | 위치 |
|------|------|
| 상속 **선 미생성** | `MxEdgeBuilder`, `edge.nestedSpecChrome` |
| 헤더 **🔼** + tooltip | `MxLabelUtils`, `MxVertexBuilder` |
| 선택 시 **부모 하이라이트** | `MxNeighborHighlight` (`nestedSpecParentIds`) |
| 플래그·필드 | `BlockModelBuilder`, `nestedSpecChrome.js`, transformer·`normalizer` |

포함=상속이 **한 부모**일 때만 적용. 일반 spec(`Car`→`Vehicle`)은 빈 삼각형 엣지 유지.

### 3.5 선택 하이라이트 (`MxNeighborHighlight.js`)

| 구분 | 색 (다크 예) | 출처 |
|------|-------------|------|
| 선택 노드 | 주황 `#ffb74d` | mx 선택 |
| 연결 노드 | 청록 `#4dd0e1` | mx 엣지 (상속 등) |
| 연관 노드 | 보라 `#ce93d8` | `model.associations` |
| 하이라이트 엣지 | 파랑 `#6ec1ff` | **z-order 최상단** |

---

## 4. 의도적 보류 (fork 후 시도·롤백)

> **여러 부모를 가진 자식 노드 UI** — README 8항목을 한 번에 맞추려다 **test-1·test-4 전역 회귀**가 반복되어 **해결 불가로 1차 마무리에서 제외.**

| 케이스 | 예시 | 상태 |
|--------|------|------|
| A. 다중 containment | `DataPort`가 ECU·Sensor 아래 | 모델 `id__in__parent` 복제만, **화면 배치 ❌** |
| B. 다중 spec 부모 | test-8 `Gateway`→`Router`·`Firewall` | 복제·부모 아래·짧은 선 **❌** |
| C. 포함=spec 1명 | test-9 `SCADA` | **nested spec 크롬 ✅** |

상세·롤백 목록: [`p_docs/07_마무리_및_알려진_한계.md`](p_docs/07_마무리_및_알려진_한계.md) §2.

**문서만 있는 규칙:** `p_docs/커스텀_규칙.md` 4·5 (Gateway Port·외부 우회 도로) — 코드 미구현.

---

## 5. 문서·검증

| 문서 | 내용 |
|------|------|
| `p_docs/레이아웃_엣지_총괄규칙.md` | 코드 전수 규칙 (마무리 시점) |
| `p_docs/03_테스트_로드맵.md` | test-1~10·갭·Phase |
| `p_docs/07_마무리_및_알려진_한계.md` | 마무리·보류 |
| `work-log.md` | 일별 diff·커밋 메시지 안 |

```bash
npm run build
node tests/verify-block-json.cjs
node scripts/check-bdd-postlayout.mjs   # 있을 때
```

**스모크 (제출 전 권장):** F5 → **test-1** (As-Is 대비) → **test-9** (🔼·선 없음·부모 HL) → **test-8** (다중 spec, **미해결 확인용**).

| 파일 | 확인 포인트 |
|------|-------------|
| test-1 | PowerTrain→Engine containment, Car/Truck→Vehicle, 교차·이탈 완화 |
| test-4 | 긴 spec·HW/SWComponent 관통 완화 (3영역 분리는 △) |
| test-8 | Gateway 다중 spec — **UI 보류**, 밴드 중복 없음만 |
| test-9 | nested spec, association 🔗·보라 연관 HL |

---

## 6. 주요 변경 파일 맵

```text
src/panel/BlockModelBuilder.js     association 분리, nestedSpecChrome, __in__ 복제(모델)
src/HtmlGenerator.js               nestedSpecChrome.js 로드
media/editor/layout.js             precomputeNodeSizes (헤더·🔗·접기)
media/editor/layout/bddLayout.js   spec 밴드·형제·test-8/9
media/editor/layout/elkLayout.js   ELK + bdd 후처리
media/editor/model/
  nestedSpecChrome.js              웹뷰 normalize 크롬
  nodeTransformer.js / edgeTransformer.js / normalizer.js
media/editor/mxgraph/
  specEdgeRouter.js                spec 직교 (N→S)
  MxEdgeBuilder.js                 비-spec·차선·nested spec 선 생략
  MxAssociationLink.js             🔗
  MxNeighborHighlight.js           선택 HL·z-order
  MxLabelUtils.js / MxVertexBuilder.js
media/editor/ui/AssociationListModal.js
media/editor/boot.js               부트·렌더 파이프라인
media/editor/config/displaySettings.js
```

---

## 7. 커밋 이력 (fork 후, 최신순)

| 커밋 | 요지 |
|------|------|
| `e18c67e` | docs: 2026-05-20 마무리·`p_docs`·알려진 한계 |
| `f8c1ef6` | feat(ui): 포함=spec 부모 → 헤더 🔼·상속선 숨김 |
| `85a67a5` | fix(mxgraph): 하이라이트 엣지 z-order 최상단 |
| `44570e2` | fix(layout): 헤더 폭(이름·🔗·접기) precompute |
| `5c8267f` | feat(mxgraph): 접기·연관 링크 겹침 방지 |
| `9458413` | feat(ui): 선택 하이라이트·test-9 spec 밴드 루트 보정 |
| `869997d` | feat(mxgraph): spec·비-spec 직교·차선·reroute 단일화 |
| `180585b` | fix(mxgraph): spec N→S 수직 진입 |
| `0cf3b93` / `9281b65` | feat(ui): 연관 모달·🔗 |
| `98dfbec` 등 | spec 앵커 분산·스파인 차선 |
| `5fc3116` / `6a23545` | BDD 스파인·자식 배치·장애물 회피 |

---

## 8. 제출·데모 시 한 줄

- **Before:** [`README.SELab.md`](README.SELab.md) · `docs/image.png` As-Is (`test-1`).
- **After:** F5 `test-1` 스크린샷 + **`test-9`** `SCADA` 선택(🔼·상속선 없음·`GridController` 청록 HL·연관 보라).
- **한계:** test-8 `Gateway` 다중 spec 부모 UI는 **의도적 보류** — `07_마무리` §2 참고.

문의·면접 데모: **test-9 + `BatteryStorage` 선택** → 연관(보라)·연결(청록)·상속(파랑, nested는 선 없음)을 한 화면에서 설명하기 좋습니다.
