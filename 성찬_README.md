# 성찬 — Block Editor 기여 요약

SELab Block Editor 미니 과제에서 **직교(Orthogonal) 엣지 품질**, **BDD 레이아웃**, **연관관계(association) 표현**, **선택 시 시각 피드백**을 중심으로 추가·개선한 내용을 정리한 문서입니다.  
과제의 최종 수용 기준은 저장소 루트 [`README.md`](README.md)입니다.

---

## 1. 과제 목표와 접근

| README 품질 기준 | 기여 방향 |
|------------------|-----------|
| 선 교차 최소화 | association을 화면·ELK에서 분리, spec 차선·뼈대 공유 규칙 |
| 노드·엣지-노드 중첩 없음 | 장애물 회피·동일 열 직선 우회·N→S 수직 진입 보정 |
| 엣지 경로 단순성 | 2점 직선 남용 금지, 불필요 nudge·waypoint 축소 |
| 계층·대칭·간격 | `bddLayout` spec 밴드·형제 대칭·스파인·포함 패킹 |
| 엣지 종단 명확성 | spec N·S 앵커, 부모 아래 자식, 통로(corridor) |

**전제:** 상속(specialization)만 mxGraph **엣지**로 그린다. 연관(association)은 **JSON `associations` + UI(🔗·모달)** 로만 다루고 선은 그리지 않는다.

---

## 2. 직교 라우팅 (spec / 비-spec)

### 2.1 spec 전용 (`specEdgeRouter.js`)

- 동일 열 2점 직선이 장애물과 겹치면 **6점** 우회(채널 + `pickVerticalChannelX`).
- **N→S** 상속에서 마지막 수직 구간이 부모 면을 관통하면 `fixSpecNsFourPointLastVerticalThroughObstacles`로 보정, 필요 시 2차 refine.
- 장애물이 없으면 앵커 nudge 생략.
- `computeSpecRoutedPathForFracs`로 refine·보정·sanitize **일원화**.

### 2.2 비-spec (`MxEdgeBuilder.js`)

- spec과 동일한 **동일 열 장애물 6점**·N→S 수직 보정(장애물 히트 시에만).
- **`rerouteAllEdges`**: 그래프 DFS **한 번**으로 spec은 `routeSpecEdge`, 비-spec은 `routeEdge` — 중복 순회 제거.

### 2.3 커스텀 규칙 1·3 (`p_docs/커스텀_규칙.md`, `displaySettings.js`)

| 규칙 | 구현 요약 |
|------|-----------|
| **1** 동일 (source,target) 다중 spec | spatial 차선 그룹에서 **제외** → 뼈대·종단 분기만, 선 중첩 허용 |
| **3** 다른 쌍·근접 중심 | `bdd.specLaneProximityPx`(22px) 이내면 `specLaneOffsetPx` 평행 차선; 같은 타깃/소스로 좁게 모이면 **N·S 앵커 이중 분산** (`specSiblingGap` 기반) |

- 스파인 체인: `assignSpecSpineLaneOffsets` — 평행 차선용 X·buffer 힌트.

### 2.4 N→S 부모 면 관통 (`180585b`)

- spec 상속이 부모 **옆면**으로 들어가던 케이스를 수직 진입·앵커 정리로 완화.

---

## 3. 연관관계 (association)

### 3.1 화면에서 association **엣지 제거**

- `BlockModelBuilder`: JSON `kind: association` → `associations[]`로 분리, `edges`에서는 제외.
- `edgeTransformer` / `visibilityFilter`: 기본적으로 association **미표시** → ELK·mx가 연관으로 배치·라우팅하지 않음.

### 3.2 UI: 🔗 링크 + 목록 모달

| 모듈 | 역할 |
|------|------|
| `MxAssociationLink.js` | 렌더 시 `associations` 인덱스, 노드 이름 옆 🔗, 클릭 시 모달 |
| `AssociationListModal.js` | 연관 상대 목록·방향(→/←/↔), 항목 클릭 시 그래프에서 해당 노드 선택 |

- `AssociationListModal`과 동일한 lookup(`_specCloneOf` 등)을 선택 하이라이트에서도 재사용.

---

## 4. BDD 레이아웃 (`bddLayout.js`)

### 4.1 spec 수직 밴드

- 부모(target)가 자식(source)보다 **위**에 오도록 레이어·Y 밴드.
- **다중 상속·다이아몬드(test-8 Gateway 등):** 루트별 BFS 숲 대신 spec 그래프 **무방향 연결 요소**마다 밴드 **한 번**만 적용 → 동일 노드가 두 번 밀리지 않음.
- **test-9:** `PowerGrid` 안의 spec 자식(`Storage` 등)은 컨테이너 좌표이므로 `isRootDiagramNode`로 spec 밴드의 Y/`layerBottom`에서 **제외** → 루트만 밴드에 반영, 빈 화면·뷰포트 이탈 방지.

### 4.2 포함·스파인·형제

- containment 스파인·단일 자식 tight 패킹·형제 가로 패킹·`enforceSpecParentAboveChildren`·부모 bbox 맞춤 등(기존 파이프라인 유지·보강).
- `syncRelativeFromAbsolute`: 절대 `x,y`와 `relativeX/Y` 이중 가산으로 mx 좌표가 깨지던 문제 방지.

---

## 5. 선택 하이라이트 (`MxNeighborHighlight.js`) — 신규

노드/엣지 클릭 시 **연결 맥락**을 색으로 구분 (다크/라이트 테마 연동).

| 구분 | 색 (다크 예) | 데이터 출처 |
|------|-------------|-------------|
| **선택(메인) 노드** | 주황 `#ffb74d`, 테두리 두께 4 | mxGraph 선택 셀 |
| **연결된 노드** | 청록 `#4dd0e1` | 선택 노드에 붙은 **mx 엣지**의 반대편 버텍스 (상속 등) |
| **연관 노드** | 보라 `#ce93d8` | `model.associations` JSON (**엣지로 그리지 않음**) |
| **mx 엣지** | 파랑 `#6ec1ff` | `graph.getEdges` |

- 연관 노드는 `AssociationListModal`과 같은 partner 수집 로직.
- `resolveCellByNodeId`: `getCell(id)` 실패 시 자식 셀 스캔.
- `renderModel` 시작 시 `neighborHighlight.clear`로 스타일 잔류 방지.
- 연동: `boot.js` `init`, `HtmlGenerator.js` 스크립트 로드.

**의도:** 상속은 선으로 이미 보이므로 “연결된 노드”만 청록; 연관은 JSON에서만 찾아 보라(예: test-9 `BatteryStorage` → `Inverter`).

---

## 6. 문서·설정

| 문서/설정 | 내용 |
|-----------|------|
| `p_docs/레이아웃_엣지_총괄규칙.md` | `rerouteAllEdges` 단일 DFS, spec 밴드(연결 요소) |
| `p_docs/커스텀_규칙.md` | 규칙 3 구현·`specLaneProximityPx` |
| `displaySettings.js` | `bdd.specLaneProximityPx` 등 |
| `work-log.md` | 지시·파일·확인 항목 시간순 기록 |

---

## 7. 테스트 JSON 확인 가이드

| 파일 | 확인 포인트 |
|------|-------------|
| test-2 | Ellipse→Drawable 상속이 Shape 관통하지 않는지 |
| test-4 | HW/SWComponent 관통·우회 |
| test-5 | spec 노드가 한 줄 Y에 몰리지 않는지 |
| test-8 | Gateway 다중 상속 레이아웃·밴드 중복 없음 |
| test-9 | 전력망 **렌더링**·association 16건·🔗·선택 시 보라 연관 노드 |
| test-3,6,7 | 회귀·직교·겹침 |

```bash
npm run build
node scripts/check-bdd-postlayout.mjs   # test-3,6,7,8,9 레이아웃 후처리 스모크
node tests/verify-block-json.cjs
```

F5 → Extension Development Host → `tests/test-*.json` 우클릭 **블록 다이어그램 옆에 열기**.

---

## 8. 주요 변경 파일 맵

```
src/panel/BlockModelBuilder.js     association 분리
media/editor/model/                visibility·edge 필터
media/editor/layout/bddLayout.js   spec 밴드·test-8/9
media/editor/layout/elkLayout.js   ELK + bdd 후처리 연동
media/editor/mxgraph/
  specEdgeRouter.js                spec 직교
  MxEdgeBuilder.js                 비-spec·차선·reroute
  MxAssociationLink.js             🔗
  MxNeighborHighlight.js           선택 하이라이트 (신규)
media/editor/ui/AssociationListModal.js
media/editor/boot.js               mx 초기화·테마·렌더 파이프라인
```

---

## 9. 커밋 이력 (본인 작업 분)

| 커밋 | 요지 |
|------|------|
| `869997d` | spec·비-spec 직교·차선·재라우팅 단일화 |
| `180585b` | spec N→S 수직 진입 |
| `0cf3b93` / `9281b65` | 연관 모달·🔗 |
| `98dfbec` 등 | spec 앵커 분산·스파인 차선 |
| (스테이징 예정) | 선택 하이라이트·test-9 spec 밴드 루트 노드만 |

---

## 10. 한계·후속

- association은 **의도적으로** mx 엣지 없음 → “연관만 선으로 보기”는 visibility 토글 설계 필요.
- 선택 하이라이트는 **단일 선택**만; 다중 선택 시 하이라이트 해제.
- Gateway Port·외부 우회 도로 등 `p_docs/커스텀_규칙.md` 4·5번은 문서 수준, 코드 미구현.

문의·데모 시 **test-9 + BatteryStorage 선택**으로 연관(보라)·연결(청록)·상속 엣지(파랑)를 한 번에 보여 주면 됩니다.
