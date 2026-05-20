# 작업 로그 (Work Log)

SELab Block Editor — `feature/layout-pipeline` 브랜치 기준.  
지시 사항 · 수정 파일 · 개선 의도를 시간순으로 기록한다.

---

## 2026-05-20 — 노드 헤더 폭(이름+🔗+접기) 사전계산

### 지시

> 노드 이름·연관 링크·접기 버튼 겹침 — 라벨 말줄임/정렬 방식은 롤백, **글자+링크+접기 길이만큼 노드 폭을 넓히기** (test-1 `Transmission` 등)

### 수정

| 파일 | 변경 요지 |
|------|------------|
| `media/editor/layout.js` | `precomputeNodeSizes`: 헤더 폭 = 이름(·스테레오타입) + 연관 🔗 실측 + 접기 33px; `elementWillFold`는 그래프 자식·compartment 선행 판단 |
| `media/editor/config/displaySettings.js` | `nodeLabel` 상수(접기·링크 여백 px) — precompute 전용 |
| `media/editor/mxgraph/MxVertexBuilder.js` | `MxLabelFit` 연동·`spacingRight` 강제·헤더 좌측정렬 제거, collapsed 시 기존 12자 말줄임만 유지 |
| `media/editor/mxgraph/MxLabelFit.js` | **삭제** (HTML 말줄임·wrapper 방식 폐기) |
| `src/HtmlGenerator.js` | `MxLabelFit.js` 스크립트 제거 |

### 개선 내용

- **겹침 원인(이전):** 라벨 HTML 맞춤·가운데 정렬이 mxGraph와 맞지 않아 오히려 레이아웃 깨짐; precompute 시점에 `_hasChildren` 미설정으로 접기 여백 누락(`Transmission`).
- **현재:** ELK 전 `el.width`에 헤더 UI 폭을 **가산** — compartment보다 헤더가 넓으면 노드가 그만큼 커짐.
- **접기 대상:** `MxFoldManager.isFoldTarget` + 부모 id 기준 자식 수 + `getCompartments`로 fold 여부 판단.
- **연관 링크:** `model.associations` endpoint면 `margin-left` + `🔗` `measureTextWidth` 합산.

### 확인

- `npm run build` 통과
- F5: test-1 `Transmission` — 이름·🔗·접기(−) 한 줄에 겹침 없음

### 커밋 메시지 (안)

```
fix(layout): 노드 폭에 이름·연관 링크·접기 버튼 길이 반영

- precomputeNodeSizes: 헤더 폭 가산, 자식·compartment로 접기 대상 선판단
- MxLabelFit·라벨 HTML 말줄임/좌측정렬 제거(롤백)
- displaySettings.nodeLabel 상수로 접기·링크 px 유지
```

---

## 2026-05-20 — 선택 하이라이트·test-9 렌더·spec 밴드

### 지시

> 노드/엣지 클릭 시 연결 맥락 하이라이트, 연관은 JSON에서만, test-9 렌더 안 됨 수정, 워크로그·커밋 메시지·성찬_README

### 수정 (스테이징 기준)

| 파일 | 변경 요지 |
|------|------------|
| `media/editor/mxgraph/MxNeighborHighlight.js` | **신규** — 선택 변경 시 메인(주황)·mx엣지(파랑)·연결노드(청록)·연관노드(보라, `associations` JSON) 테두리 |
| `media/editor/boot.js` | `neighborHighlight.init(graph)` |
| `src/HtmlGenerator.js` | 스크립트 로드 |
| `media/editor/mxgraph/MxCellFactory.js` | `renderModel` 전 `neighborHighlight.clear` |
| `media/editor/mxgraph/index.js` | 모듈 목록 주석 |
| `media/editor/layout/bddLayout.js` | spec 밴드: 무방향 연결 요소·`isRootDiagramNode`(컨테이너 내 spec은 밴드 Y/layerBottom 제외, test-9) |
| `p_docs/레이아웃_엣지_총괄규칙.md` | spec 밴드 연결 요소 설명 한 줄 |

| `성찬_README.md` | 본인 기여 전체 요약(과제·라우팅·연관·레이아웃·하이라이트·테스트) |

### 개선 내용

- **연관 노드:** mx 엣지 탐색이 아니라 `BlockModelBuilder` → `model.associations`와 `AssociationListModal`과 동일 partner lookup.
- **연결 노드:** 선택 버텍스에 붙은 **렌더된 mx 엣지**의 반대편 노드만 (상속 등). 상속은 선으로 이미 보임.
- **test-9:** `Storage@PowerGrid` 같이 containment 안 spec 노드가 `layerBottom`만 끌어올려 루트 Y가 뷰포트 밖으로 가던 문제 → 루트 다이어그램 노드만 밴드 반영.

### 확인

- `npm run build` 통과
- `node scripts/check-bdd-postlayout.mjs` — test-9 OK
- F5: test-9 표시·BatteryStorage 선택 시 Inverter 등 보라 테두리

### 커밋 메시지 (안)

```
feat(ui): 선택 하이라이트와 test-9 spec 밴드 루트 노드 보정

- MxNeighborHighlight: 메인·mx엣지·연결·연관(JSON) 테두리 색 분리, 다크/라이트
- bddLayout: spec 밴드는 연결 요소 단위, 컨테이너 내부 spec은 Y 밴드 제외(test-9)
- boot·HtmlGenerator·renderModel clear 연동
- 성찬_README.md 기여 요약 추가
```

---

## 2026-05-20 — spec·비spec 직교 라우팅·차선·재라우팅 정리

### 지시

> 커스텀 규칙(동일 쌍 뼈대 공유 / 서로 다른 쌍은 차선) 반영, test-2·test-4 관통 완화, 상속만 mx 엣지 전제로 최적화, 커밋·워크로그

### 수정 (스테이징 기준)

| 파일 | 변경 요지 |
|------|------------|
| `media/editor/mxgraph/specEdgeRouter.js` | 동일 열 2점 직선이 장애물이면 6점 우회, N→S 마지막 수직 보정·2차 refine, 장애물 없을 때 nudge 생략, 앵커 nudge 후보 중복 제거, `computeSpecRoutedPathForFracs`로 경로 계산 일원화 |
| `media/editor/mxgraph/MxEdgeBuilder.js` | 비-spec도 동일 열 장애물 시 6점·N→S 마지막 수직 보정(히트 시만), `rerouteAllEdges` 단일 DFS로 spec·비-spec 처리, `assignSpatiallyOverlappingSpecLaneOffsets`·좁은 소스/타깃 시 N·S 앵커 이중 분산 |
| `media/editor/config/displaySettings.js` | `bdd.specLaneProximityPx`(기본 22) — 근접 spec 차선 그룹 판정 |
| `p_docs/레이아웃_엣지_총괄규칙.md` | `rerouteAllEdges` 한 번 DFS 설명 갱신 |
| `p_docs/커스텀_규칙.md` | 규칙 3 구현 위치·설정 키 한 줄 |

### 개선 내용

- test-2 Ellipse→Drawable·test-4 HW/SW 등 **중간 노드 관통** 완화(직선 단축 제거 + 우회 + 앵커 탐색).
- **커스텀 규칙 1**: 동일 `(source,target)` spec 다중은 spatial 차선에서 제외(뼈대 공유 유지).
- **커스텀 규칙 3**: 출발·도착 중심이 가까운 **서로 다른 쌍**에 `specLaneOffsetPx` 차선; 같은 타깃/소스로 모이는데 가로 간격이 좁으면 N·S 종단 분산 강화.
- 재라우팅 **그래프 순회 1회**로 비용 축소(상속만 엣지인 경우에도 비-spec 경로는 그대로 두되 호출 구조 단순화).

### 확인

- `npm run build` 통과
- test-2·test-4 상속 선·겹침 수동 확인 권장

---

## 2026-05-16 — 브랜치 정리

### 지시

> 커밋 `8500c3fa`로 돌아간 다음 브랜치 새로 파서 작업하고 싶다.

### 수행

- 미커밋 Phase A(postLayout/overlap) 작업은 `git stash`로 보관  
  - 메시지: `WIP: postLayout/overlap (8500c3f 복귀 전)`
- 브랜치 `feature/layout-pipeline` 생성, `HEAD` = `8500c3f`
- `master`는 `4f58575` 등 이후 커밋 유지(리셋 없음)

### 메모

- 이전 대화에서 시도했던 postLayout 파이프라인·겹침 보정은 화면 전반이 깨져 **베이스를 되돌린 상태**에서 다시 시작하는 맥락.

---

## 2026-05-16 — 연관관계(association) 엣지 미표시

### 지시

> 연관관계 기존 로직 최대한 사용하면서 최소한의 수정으로 개선. **1. 연관관계 엣지 미표시**

### 목표

- README 과제(직교·계층·겹침)에 방해되는 association 선을 화면·레이아웃에서 제거
- SysON 가시성 필터 패턴 재사용, 과도한 신규 모듈 없음

### 수정 (`b12bbc6`)

| 파일 | 변경 |
|------|------|
| `media/editor/model/visibilityFilter.js` | `visibilityConfig` 없을 때 **association 기본 `false`** |
| `media/editor/model/edgeTransformer.js` | `filterEdges`에서 association을 `shouldShowEdgeInEditor`로 필터 (containment와 동일 패턴) |
| `src/panel/BlockModelBuilder.js` | 웹뷰로 넘기기 전 association 엣지 제외 (`containment`와 같이 스킵) |

### 개선 내용

- mxGraph에 association 엣지가 그려지지 않음
- 정규화 후 `connections`에도 포함되지 않아 **ELK가 연관관계로 노드 배치를 흔들지 않음**
- 계층용 `allConnectionsForHierarchy`는 기존대로 전체 엣지 유지(containment·specialization 등)
- 나중에 켜려면 `visibilityConfig.edges.*.association: true` 로 토글 가능

### 확인

- `npm run build` 통과
- F5: `tests/test-3.json`, `test-9.json` 등에서 association 선 제거 여부 수동 확인 권장

---

## 2026-05-16 — 스테레오타입 UI 미표시

### 지시

> UI상에서 **스테레오타입 미표시**

### 목표

- BDD 블록 헤더에서 `«part def»` 등 제거, **노드 이름만** 표시
- `precomputeNodeSizes`·mxGraph 라벨이 같은 규칙을 따르도록 단일 스위치

### 수정 (`9fc9ab2`)

| 파일 | 변경 |
|------|------|
| `media/editor/config/displaySettings.js` | `labels.showStereotypes: false` 추가 |
| `media/editor/utils.js` | `shouldShowStereotypesInUi()`, `getStereotypeText()` 가드 |
| `media/editor/mxgraph/MxLabelUtils.js` | `formatLabel` / `getTypeKeyword`에서 스테레오타입 분기 생략 |
| `media/editor/mxgraph/MxVertexBuilder.js` | comment·terminate 등 직접 `«…»` 붙이던 경로도 플래그 반영 |

### 개선 내용

- **표시:** `Vehicle`만 보이고 `«part def»` 줄 제거
- **유지:** `name : Type`, `:> SuperType` 등 이름 관련 접미는 `formatLabel` 기존 로직 유지
- **크기:** `layout.js`가 `getStereotypeText`를 쓰므로 헤더 높이·폭에서 스테레오타입 줄 제외
- **복구:** `displaySettings.labels.showStereotypes = true` 로 되돌릴 수 있음

### 확인

- `npm run build` 통과
- F5: test-1 등에서 헤더 스테레오타입 제거 여부 수동 확인 권장

---

## 2026-05-16 — FeatureTyping 소스 → 타겟 푸터 텍스트

### 지시

> (로직 최소 변경) FeatureTyping의 소스 노드는 타겟 노드의 **푸터 레이아웃**에 텍스트로 넣을 것.  
> 예: `battery_p` → `BatterySystem` 이면 `BatterySystem` 푸터에 `battery_p`.

### 수정 (`2c50073` + 푸터 구분선 후속)

| 파일 | 내용 |
|------|------|
| `model/normalizer.js` | `applyFeatureTypingFooters` — 타겟에 `featureTypingFooter[]`, 소스 usage `hidden` |
| `model/edgeTransformer.js` | 푸터로 표시한 featuretyping 엣지는 렌더·connections에서 제외 |
| `mxgraph/MxCompartmentRenderer.js` | `createFeatureTypingFooterCells` — 하단 구분선 + 텍스트 행 |
| `mxgraph/MxVertexBuilder.js` | 버텍스 생성 후 푸터 셀 부착 |
| `layout.js` / `elkLayout.js` | `_featureUsageFooterHeight` → ELK bottom padding·leaf 높이 |
| `mxgraph/MxCellFactory.js` | 자식 맞춤 시 푸터 영역 예약 |
| `mxgraph/MxEdgeBuilder.js` | featuretyping 엣지 미생성(이중 방어) |
| `displaySettings.js` | `featureUsageSlot` 메트릭 |

### 개선 내용

- `battery_p` 등 **part usage 박스·엣지 제거**, 타입 정의 블록 **하단에 usage id** 표시
- JSON `id` 우선 (`battery_p`), README 계층·직교 과제에 맞게 시각 단순화

### 확인

- F5 + `tests/test-1.json`: `BatterySystem` 푸터에 `battery_p`, `engine_p` 등
- `npm run build`

### 후속 수정 — 푸터 구분선이 박스 밖으로 삐져나감

**원인:** 푸터를 `createVertex` 시점(넓은 ELK 폭)에 그린 뒤 `resizeParentsToFitChildren`이 부모 폭을 자식에 맞게 **축소** → HR 셀 너비는 그대로.

**조치:** `resizeParents` **이후** `attachFeatureTypingFooters`로 푸터 부착, HR `overflow=hidden`·`width:100%` box-sizing.

### 후속 수정 — 푸터 구분선이 안 보임

**조치:** 첫 푸터 행 HTML `border-top` + `orderCells`, `HR_HEIGHT` 여백 유지 (`MxCompartmentRenderer.js`).

### 커밋

- `2c50073` — FeatureTyping 푸터·usage hidden·엣지 제외

---

## 2026-05-16 — AttributeDefinition → 부모 compartment 텍스트

### 지시

> `attributedefinition`을 port와 같이 **독립 노드 없이** 부모 `attributes` compartment에만 표시.

### 수정 (`b32cb22`)

| 파일 | 변경 |
|------|------|
| `media/editor/model/nodeTransformer.js` | `attributeDefNodes` 분리·일반 노드 변환 제외 |
| `media/editor/model/portBorderNodeHandler.js` | `processAttributeDefinitionCompartments` |

### 확인

- test-1: `maxPower` 등이 `Vehicle` attributes 줄에만 표시

---

## 2026-05-16 — compartment·자식 있을 때 헤더 라벨 상단 정렬

### 문제

- compartment만 있는 리프 노드에서 이름이 박스 **세로 중앙**에 겹침 (`hasGraphChildren`만 top 처리).

### 수정 (`938630f`)

| 파일 | 변경 |
|------|------|
| `media/editor/mxgraph/MxVertexBuilder.js` | `needsHeaderTopLabelAlign()` — compartment·border·푸터 시 `verticalAlign=top` |
| `media/editor/mxgraph/MxCompartmentRenderer.js` | `_labelHeight` 저장 |

---

## 2026-05-16 — specialization 상하 계층 (ELK)

### 지시

> JSON `source`=자식, `target`=부모(예: `Car → Vehicle`)일 때 **부모가 위**.

### 수정 (`e5114d9`)

| 파일 | 변경 |
|------|------|
| `media/editor/layout/elkLayout.js` | specialization ELK 엣지 swap, `computeRanks` 반영, `applySpecializationVerticalLayout`, specialization waypoint 스킵 |
| `media/editor/mxgraph/MxEdgeBuilder.js` | waypoint 없을 때 `exitY=0` / `entryY=1` |

### 메모

- ELK만으로 루트 복합 노드 Y가 안 바뀌는 경우 **Y 밴드 후처리** 필요.
- `isSpecializationHierarchyKind`가 elkLayout·MxEdgeBuilder에 중복(공통 유틸 여지).

### 확인

- F5 + `tests/test-1.json`: Vehicle / Car / Truck 층·specialization 직교선

---

## 2026-05-16 — JSON·media 저장 시 자동 재렌더

### 지시

> 코드 수정 시 바로 재렌더링.

### 수정 (`437378f`)

| 파일 | 변경 |
|------|------|
| `src/extension.js` | `BlockDiagramPanel.installAutoRefresh` 호출 |
| `src/BlockDiagramPanel.js` | JSON `onDidChangeTextDocument`(400ms 디바운스), 개발 모드 `media/editor/**` 감시 → 웹뷰 HTML 리로드 |
| `src/panel/LanguageServerBridge.js` | 편집기 버퍼(`rawText`) 파싱 — 미저장 JSON 반영 |
| `src/panel/index.js` | `fetchBlockModel(uri, rawText)` |

### 개선 내용

- JSON 저장 시 즉시 + 타이핑 중 디바운스 갱신
- Extension Development Host에서 `media/editor` JS 저장 시 `ready` → 모델 재전송
- `src/extension.js` 변경은 여전히 **창 리로드** 필요

---

## 2026-05-16 — test-4 겹침 (HWComponent·Interrupt)

### 지시

> test-4에서 `HWComponent`↔`HardwareSystem`, `Microcontroller` 안 `Interrupt`↔attributes 겹침 — JSON 관계 확인 후 수정.

### test-4 관계 요약

| 현상 | JSON |
|------|------|
| HWComponent ↔ HardwareSystem | 둘 다 **루트** (`HWComponent`→`Component` specialization만, containment로 묶이지 않음) |
| Interrupt ↔ attributes | `Microcontroller`→`Interrupt`·`Register` containment, `clockFreq` 등은 **compartment** |

### 원인

1. 루트 형제 bbox **겹침 해소 없음** + specialization Y 밴드가 같은 층 루트를 비슷한 Y에 둠
2. ELK `paddingTop`에 **라벨 높이 누락** (compartment 높이만)
3. `resizeParentsToFitChildren`이 헤더 **35px 고정**으로 자식을 compartment 위로 당김

### 수정 (`d310653`)

| 파일 | 변경 |
|------|------|
| `media/editor/layout.js` | `_precomputedPaddingTop` = `labelHeight + compartmentHeight` |
| `media/editor/layout/elkLayout.js` | 컨테이너 `paddingTop` 정합, `resolveSiblingOverlaps`, `alignRanks` 보수 설정 |
| `media/editor/mxgraph/MxCellFactory.js` | `getContentAreaTop` — compartment 아래에서만 자식 중앙·fit |

### 확인

- F5 + `tests/test-4.json`: 루트 겹침·Microcontroller 내부 겹침 수동 확인 권장

---

## 2026-05-16 — compartment·푸터 구분선 (넘침 → 사라짐 → 짧아짐 → 정상)

### 지시

> 노드 박스 compartment·푸터 **가로 구분선**이 우측 테두리 밖으로 삐져남 → 수정 후 **헤더↔ports 구분선이 아예 없어지고**, **푸터 구분선만 짧아짐** → 다시 맞춰 **깔끔하게** 보이게.

### 현상 (단계별)

| 단계 | 화면 |
|------|------|
| As-Is | attributes·푸터 위 `border-top` 선이 박스 **오른쪽 밖**으로 1~4px 돌출 (`Engine`, `Transmission` 등 공통) |
| 1차 시도 후 | 타이틀↔**ports** 사이 선 **전부 없음**; `engine_p` 등 푸터 위 선은 박스 폭의 **절반 정도**만 표시 |
| 최종 | 구분선이 박스 안쪽에 **전폭**으로 표시, 푸터 하단 슬롯 정렬 유지 |

### 원인 (확정)

**1) 우측 넘침 (초기)**

| # | 원인 |
|---|------|
| A | HR·compartment 자식 `geometry.width = parentGeo.width` — `resizeParentsToFitChildren` **이후** 부모가 줄어도 decor 자식 너비 미갱신 |
| B | 구분선 HTML `margin:4px 0` + `overflow=fill` → mxGraph HTML 렌더에서 시각 폭이 geometry를 **넘김** |
| C | (부차) `strokeWidth` 미반영 시 전체 폭 사용 → 테두리와 겹쳐 “삐져나온 것처럼” 보임 |

**2) 헤더↔ports 선 사라짐 (1차 수정 회귀)**

| # | 원인 |
|---|------|
| D | HR 셀에 **`overflow=hidden`** 적용 — mxGraph `html=1` + **`align=left`** 조합이 라벨 박스를 **텍스트 너비만** 잡음. 값이 빈 HR 셀은 사실상 **폭 0** → `border-top` 구분선이 그려지지 않음 |
| E | `getVertexContentBounds`가 `x = spacingLeft + strokeInset`까지 밀어 넣음 — 남는 선분이 **부모 타이틀(html 라벨) 영역 아래**에 가려짐. 예전에는 우측으로만 삐져나와 **일부는 보였음** |
| F | (이전) `strokeInset × 2`까지 폭에서 제거 → 푸터·decor 셀이 **과도하게 좁아짐** |

**3) 푸터 선만 짧아짐**

- 푸터·HR 모두 D+F 동일 적용 → 셀 geometry는 좁은데, 푸터는 `border-top`이 셀 안 HTML이라 **짧은 선**이 더 눈에 띔.
- compartment HR은 D 때문에 **아예 미표시**.

**정리:** “폭 계산만 줄이면 된다”가 반만 맞음. mxGraph HTML decor는 **`overflow=fill`로 geometry를 채워야** 하고, 폭은 **stroke 1px 수준만** 줄이며, HR은 **z-order(`orderCells`)** 로 타이틀에 가리지 않게 해야 함.

### 수정 (`c0a28cc` · `MxCompartmentRenderer.js` / `MxCellFactory.js`)

| 파일 | 변경 |
|------|------|
| `media/editor/mxgraph/MxCompartmentRenderer.js` | `getVertexDecorBounds` — `x=spacingLeft`, `width = parentWidth - spacing - strokeTrim(1px)` |
| 동일 | `dividerLineHtml()` — margin 제거, `box-sizing` + `max-width:100%` |
| 동일 | compartment HR·헤더·항목: `decorX/decorW`, HR은 `overflow=fill` + `spacingLeft/Right=0` |
| 동일 | FeatureTyping **푸터 단일 하단 셀** (`border-top` + `<br/>` 텍스트), `pinFeatureTypingFooterToBottom` |
| 동일 | HR 생성 후 `orderCells(true, hrCells)` — 타이틀 라벨에 가리지 않음 |
| 동일 | `syncAllInteriorDecorWidths` — `resizeParents`·푸터 부착 **후** decor·푸터 폭 재동기화 |
| `media/editor/mxgraph/MxCellFactory.js` | `resizeParents` → `attachFeatureTypingFooters` → **`syncAllInteriorDecorWidths`** 순서 |

### 개선 내용

- compartment 구분선(타이틀↔ports/attributes, 마지막 trail HR) **전폭·박스 안**
- FeatureTyping 푸터(`motor_p`, `engine_p` 등) **하단 고정** + 상단 구분선 전폭
- 우측 1~2px 넘침은 `strokeTrim`만으로 억제 (margin 제거가 핵심)

### 확인

- F5 + `tests/test-1.json`: `Engine` / `Transmission` / `ElectricMotor` — 헤더↔ports·푸터 구분선
- 상세 분석 메모: `p_docs/04_구분선_넘침_이슈.md` (초기 원인표; 최종 구현은 `getVertexDecorBounds` 명칭)

---

## 2026-05-16 — Phase 1-A test-1 노드 배치 (엣지 전제)

### 지시

> 로드맵 1단계부터 — containment·specialization·겹침/이탈 (엣지 작업 전제).

### 수정 (`d63aed4` — `elkLayout.js`, `MxEdgeBuilder.js`)

| 함수 | 역할 |
|------|------|
| `applySpecializationAroundParentLayout` | 부모(Vehicle) **아래**에 spec 자식(Car, Truck) 가로 중앙 (UML 서브타입 아래) |
| `fitDiagramToMargins` | 전체 다이어그램 min(x,y) ≥ 48px (캔버스 이탈 완화) |
| `getSpecializationAnchorStyles` | spec 엣지 exit/entry를 노드 상대 위치에 맞게 (Car→Vehicle 우회 제거) |

호출 순서: ELK → `applySpecializationVerticalLayout` → **aroundParent** → **fitMargins** → edgeRouting → alignRanks → `resolveSiblingOverlaps`.

### 확인

- F5 + `tests/test-1.json`: Vehicle 위, Car·Truck 아래, BatterySystem과 겹침 없는지

---

## 2026-05-16 — specialization 엣지 우회 (Car→Vehicle)

### 현상

- Car가 Vehicle **위**에 배치됐는데 specialization 선이 오른쪽으로 크게 돌아 Vehicle **하단**에 도착
- Truck→Vehicle은 짧은 수직선이나 Car 선과 겹침

### 원인

- `MxEdgeBuilder`: specialization에 **항상** `exitY=0`(소스 상단)·`entryY=1`(타겟 하단) 고정
- 1-A에서 Car를 부모 **위**로 옮기면서 기하와 앵커가 **반대** → mxGraph 직교 라우터가 박스를 피해 우회

### 수정 (`MxEdgeBuilder.js`)

- `getSpecializationAnchorStyles(graph, source, target)` — 절대 좌표 중심 비교
  - 타겟이 아래: `exitY=1` → `entryY=0`
  - 타겟이 위: `exitY=0` → `entryY=1`
  - 좌우 우세 시 `exitX`/`entryX` 측면

---

## 2026-05-18 — BDD 후처리·직교 엣지 (Phase 레이아웃 파이프라인)

### 지시·목표

> README 직교 품질·로드맵 — containment/spec 후처리, 엣지 직교·상속 라우팅, BDD `bddLayout` 도입.

### 수정 (`5376fbd`)

| 파일 | 변경 |
|------|------|
| `media/editor/layout/bddLayout.js` | **신규** — `applyPostLayout`: spec Y 밴드, spec 자식 대칭, 형제 겹침, `fitDiagramToMargins` |
| `media/editor/layout/elkLayout.js` | ELK 후 `bdd.applyPostLayout` 호출, spec waypoint 정리·간격 조정 |
| `media/editor/mxgraph/MxEdgeBuilder.js` | 직교 라우팅·obstacle 회피·spec 앵커 정책 대폭 정리 |
| `media/editor/mxgraph/edgeOrthogonalPolicy.js` | **신규** — 엣지 스타일·직교 정책 공통화 |
| `media/editor/mxgraph/specEdgeRouter.js` | **신규** — specialization 엣지 전용 라우터 |
| `media/editor/config/displaySettings.js` | bdd·elk·spec 간격 설정 |
| `src/HtmlGenerator.js` | `bddLayout.js`, `edgeOrthogonalPolicy.js` 스크립트 로드 |
| `p_docs/레이아웃_엣지_총괄규칙.md`, `p_docs/README과제_코드맵과용어집.md` | 규칙·코드맵 문서 |

### 개선 내용

- ELK 배치 **이후** BDD 전용 후처리 파이프라인 분리
- specialization·containment 시각 규칙을 레이아웃·엣지 모듈로 나눔

---

## 2026-05-18 — BlockModelBuilder containment 부모 맵

### 지시·목표

> 웹뷰로 넘기기 전 containment **직접 부모**를 엣지 순서대로 정확히 반영 (동일 id·다중 부모 대비).

### 수정 (`b161a12`)

| 파일 | 변경 |
|------|------|
| `src/panel/BlockModelBuilder.js` | `collectContainmentParentsByTarget`, `buildDirectParentMap`, `containmentCloneId` |
| `src/panel/containmentPolicy.js` | **신규**(Node) — 단일 자식 판별·unnest 정책(후에 웹뷰와 분리) |

### 개선 내용

- `node.parent`와 synthetic `block-containment:` 엣지가 hierarchy·ELK와 맞게 이어짐
- test-1 등 compartment만 있는 자식도 **직접 자식 수**에 포함되도록 이후 웹뷰 policy와 연동

---

## 2026-05-18 — BDD 컨테이너 자식 가로 한 줄

### 지시·목표

> ELK가 컨테이너 안 형제를 **세로로 쌓는** 경우, BDD식 **가로 한 줄**로 맞춤 (test-1 PowerTrain 등).

### 수정 (`178619d`)

| 파일 | 변경 |
|------|------|
| `media/editor/layout/bddLayout.js` | `packContainmentChildrenHorizontally` |
| `media/editor/mxgraph/MxCellFactory.js` | 렌더 시 2+ 자식 BDD 컨테이너 가로 팩·중앙 |
| `media/editor/config/displaySettings.js` | `bdd.containmentRowGap` |

### 개선 내용

- 형제 2개 이상인 BDD 블록만 대상 (단일 자식 체인과 별도)

---

## 2026-05-19 — test-4 단일 부모→자식 체인(스파인) 레이아웃

### 지시·배경

> test-4: `System→…→Primitive` 7단 **부모→자식→자식…** 만 있는 체인.  
> unnest+화살표로 펼치면 ELK·도메인 배치가 깨짐 → **중첩 유지**, 가독성만 최적화.  
> 화면이 안 바뀌던 문제는 별도 원인(아래) 해결 후 **개선 확인됨**.

### 방향

| 시도 | 결과 |
|------|------|
| 단일 자식 unnest + containment 화살표 | 전역 배치 붕괴 → **비활성** (`applySingleChildContainmentUnnest` no-op) |
| 컴팩트 스파인 | 체인 통째로 열 너비·세로 스택·가로 중앙 |

### 수정 (`a3ae12c` 등)

| 파일 | 변경 |
|------|------|
| `media/editor/model/containmentPolicy.js` | **신규** — structural 자식 수, `markCompactContainmentSpines`, unnest no-op |
| `media/editor/layout/bddLayout.js` | `collectContainmentSpineChains`, `layoutContainmentSpineChain`, `layoutTightSingleChildContainers`, `layoutSingleChildPair` |
| `media/editor/config/displaySettings.js` | `singleChildContainmentPad`, `containmentSpineMinChain`, `compactSpine*` |
| `media/editor/layout/elkLayout.js` | 단일 자식 compound ELK padding 6px, `invokeBddPostLayout`, **alignRanks 뒤** `applyPostLayout` |
| `media/editor/layout.js` | **`NS.Editor.layout.bdd` 보존** (전체 교체 시 삭제되던 버그 수정) |
| `media/editor/boot.js` | ELK 전 `markCompactContainmentSpines`; guiData는 스파인 노드 **위치만** 복원 |
| `media/editor/mxgraph/MxVertexBuilder.js` | tight/spine 부모 아래 자식 **가로 중앙** (`relativeX` 폴백) |
| `media/editor/mxgraph/MxCellFactory.js` | 단일 자식 spine: 부모 폭 축소·자식 geometry 중앙, resizeParents 스킵 |
| `src/HtmlGenerator.js` | `containmentPolicy.js` 로드 |
| `p_docs/커스텀_규칙.md` | 포함관계·직교 규칙 정리 |

### 파이프라인 (정상 경로)

```text
normalize → deriveHierarchy
  → markCompactContainmentSpines (boot)
  → precomputeNodeSizes (spine 라벨 높이 32px)
  → applyElkLayout → applyPositions
  → alignRanks → bdd.applyPostLayout
       → packContainment(형제 2+)
       → mark + layoutTightSingleChildContainers (스파인)
  → renderModel → (guiData 위치만)
```

### 스파인 레이아웃 규칙 (요약 · 초기)

- 체인 루트부터 `getStructuralChildIds`로 **BDD 블록만** 자식 카운트
- (초기) 체인 전체 **단일 `columnW`** — 후속 **깊이별 폭·여백**은 아래 「스파인 깊이별 폭·여백」 참고
- test-4: `System→…→Primitive`, `SoftwareSystem→SoftwareSubsystem`, `HardwareSystem→HardwareSubsystem` 등

### 원인 — 스파인이 **전혀** 안 먹던 이유 (확정)

| # | 원인 |
|---|------|
| 1 | **`layout.js`가 `ns.Editor.layout = { run, precompute… }`로 통째 교체** → `bddLayout.js`가 등록한 **`NS.Editor.layout.bdd` 소멸** |
| 2 | `elkLayout`의 `NS.Editor.layout.bdd?.applyPostLayout` → **undefined** → legacy 분기만 실행 |
| 3 | `boot`의 `markCompactContainmentSpines`도 **스킵** |
| 4 | (부가) ELK `catch` / ELK 미로드 시 `fallbackGrid`만 하고 후처리 없음 → `invokeBddPostLayout`으로 보완 |

### 원인 — 적용됐는데 **왼쪽 치우침** (확정)

| # | 원인 |
|---|------|
| A | ELK 큰 `parent.width` 유지 + `relativeX≈6` (왼쪽만 패딩) |
| B | `MxCellFactory`가 `parentNodeEarly.width`(ELK값)로 중앙 계산 |
| C | `MxVertexBuilder`가 `relativeX` 없을 때 절대 `x` 또는 `10` 폴백 |

### 조치 (위 원인 대응)

- `layout.js`에서 `layout.bdd` **병합 보존**
- spine 부모 width = `child.w + 2×side`만 사용, ELK 폭 무시
- `unifySingleChildColumnWidths` → `layoutContainmentSpineChain`으로 통합
- `shiftSubtreeRigid`: `relativeX` 이중 가산 제거(절대 좌표만 이동)

### 확인

- Reload Window + `tests/test-4.json`
- 콘솔: `[bddLayout] spine chains: …`, `[bddLayout] containment spine 적용: N 컨테이너`
- `NS.Editor.layout.bdd 없음` 경고 **없어야** 함

---

## 2026-05-19 — 스파인 깊이별 폭·여백 (계단형 중첩)

### 지시

> 중첩이 깊어질수록 하위 컨테이너가 너무 작아 보임.  
> **얕은 단계**는 자식 박스가 분명히 안쪽에 보이도록 좌우 프레임을 넓히고,  
> **깊은 단계**는 최소 좌우·하단 여백을 줄여 박스가 줄어들 때 여백도 같이 줄이기.

### 수정 (`b1b2cda`)

| 파일 | 변경 |
|------|------|
| `media/editor/layout/bddLayout.js` | `getSpineSidePadForDepth`, `getSpineBottomPadForDepth`, `layoutContainmentSpineChain` — 말단→루트로 단계별 폭 산출 |
| `media/editor/config/displaySettings.js` | `spineShallowSidePad`(16), `spineDeepSidePad`(2), `spineShallowBottomPad`(10), `spineDeepBottomPad`(4) |
| `media/editor/mxgraph/MxCellFactory.js` | `_spineSidePad` / `_spineBottomPad` / `bddLayout`에서 잡은 `width` 우선 반영 |

### 규칙

- 말단 노드 폭 = 기존 precompute 폭 유지
- 부모 `i`: `width[i] = max(제목 최소폭, width[i+1] + 2×sidePad(i))`
- `sidePad(i)`: 루트 쪽 **16px** → 말단 직전 **2px** 선형 보간 (`depthIndex / (containerCount-1)`)
- `relativeX = (parentW - childW) / 2` — 단계마다 다른 `parentW`·`childW`
- 노드에 `_spineSidePad`, `_spineBottomPad` 저장 → mx 렌더와 좌표 일치

### 개선 내용

- 루트(`System` 등)는 이전 단일 열보다 **넓은 프레임** → 포함 관계가 한눈에 보임
- 안쪽(`Primitive` 쪽)은 **여백 2px** 수준으로 타이트 → 깊은 중첩도 답닷하지 않음
- `displaySettings.bdd.spineShallowSidePad` / `spineDeepSidePad` 로 튜닝 가능

### 확인

- Reload Window + `tests/test-4.json`: 7단 체인이 바깥 넓음 → 안쪽 좁음 계단형인지
- SW/HW `…→Subsystem` 2단 체인도 루트만 넓은 프레임 적용

---

## 2026-05-19 — test-1 Car/Truck 겹침 · test-4 HW 부모-자식 넘침

### 증상

- test-1: `Car`·`Truck` bbox 겹침
- test-4: `HardwareSubsystem`가 `HardwareSystem` 박스 밖으로 걸침

### 원인

| 이슈 | 원인 |
|------|------|
| Car/Truck | `applySpecChildrenSymmetric` 배치 후 **최소 가로 간격** 미보장 (루트 전체 `resolveSiblingOverlaps`만으로는 인접하지 않은 쌍 누락) |
| HW 넘침 | 스파인 부모 `height`에 **FeatureTyping 푸터**(`hw_p`) 미포함; mx `resizeParents`가 **모델보다 큰 자식 geometry**·확장된 `HardwareSubsystem` 폭을 부모에 반영 안 함 |

### 수정 (미커밋)

- `bddLayout.js`: spec 자식 행 **gap 강제**; 스파인·`layoutSingleChildPair`에 `_featureUsageFooterHeight` 반영; 스파인 부모 `width/height` 자식 기준 재맞춤
- `MxCellFactory.js`: 단일 자식 부모 — `max(모델, mxGeo)` 자식 크기, 푸터 높이, `parentW = max(layout, child+pad)`; 다자식 부모 **모델 width/height 동기화**

### 확인

- Reload Window → `test-1.json` Car/Truck 분리
- `test-4.json` HardwareSubsystem가 HardwareSystem 안쪽

### test-5 — spec 숲 겹침 (Signal·Bus·Codec 등)

**계층 (spec, containment 요약):**

```text
Signal ← AnalogSignal, DigitalSignal ← PWMSignal|I2CSignal|SPISignal|UARTSignal
Bus ← I2CBus|SPIBus|UARTBus  (각 Bus → Signal 타입 containment)
Transmitter ← Transceiver → Receiver (이중 specialization)
Codec — spec 없음, association만 (루트)
```

**원인**

| # | 원인 |
|---|------|
| 1 | `applySpecVerticalBands`가 **서로 다른 spec 루트**(Signal·Bus·Transmitter·Receiver)를 **같은 layer-0 밴드 Y**에 배치 |
| 2 | `Transceiver` **이중 spec 부모** — `childToParent` 맵 덮어쓰기 + symmetric **두 번 배치** |
| 3 | `resolveSiblingOverlaps`가 `relativeX` 사용·**인접 쌍만** 밀어 루트(Codec 등) 겹침 잔존 |

**수정:** spec **숲(forest)마다** Y 밴드, 다중 spec 부모 layer=max(parent)+1, symmetric `specRowPlaced`, 겹침 **절대좌표·전쌍** 검사

### test-2 — Polygon이 Triangle 아래에 있음

**관계:** `Triangle → Polygon` (specialization), `Layer → Triangle` (containment). Triangle은 Layer 안, Polygon은 밖.

**원인:** `applySpecVerticalBands`가 Triangle까지 spec 밴드 Y로 끌어올림 + Polygon은 ELK 위치 유지 → 부모가 자식보다 아래.

**수정:** containment `parent` 있는 노드는 spec 밴드 Y 스킵; `enforceSpecParentAboveChildren` — 자식 **절대 Y** 기준으로 spec 부모·조상을 위로만 이동.

### 후속 (test-1 여전히 겹침)

**원인:** `applySpecChildrenSymmetric`이 **pack·단일자식 tight보다 먼저** 실행 → `Car.width`가 작은 값(≈120)으로 `Truck.x` 계산 → 넓어진 Car 박스 위에 Truck 겹침.

**수정:** `applyPostLayout` 순서 변경 — pack → spine/tight → **그 다음** spec 형제 배치. `layoutWidthForSpecSibling`로 Car 내부 containment 폭 반영, 이동 시 `shiftDescendantsOf`.

---

## 2026-05-19 — 롤백: 레이아웃 파이프라인·geometry 일괄 수정 철회

### 상황

> README 정합 작업으로 **한 번에** 넣었던 변경 후 레이아웃 전반이 깨져 **롤백**함.  
> **현재 HEAD:** `b1b2cda` (스파인 깊이별 폭·여백만 유지).  
> 철회된 것(미커밋): `layoutPipeline.js`, `diagramVertexUtils.js`, boot/fold 파이프라인 통합, geometry 필터, guiData spine 전면 스킵, `MxCellFactory` relative 동기화 일괄, panel `containmentPolicy` 삭제.

### 깨졌을 가능성이 큰 원인 (추정)

| # | 변경 | 예상 증상 |
|---|------|-----------|
| 1 | guiData 복원 시 `_tightSingleChildContainer`까지 위치 스킵 | test-1 등 **저장 좌표가 있는 대부분 단일자식 부모**가 ELK만 적용 → Vehicle·PowerTrain 등 전체 어긋남 |
| 2 | geometry 저장에서 decor 제외 + 기존 store에 decor 키 혼재 | 일부 노드만 복원·누락이 섞여 **겹침·빈 공간** |
| 3 | `runDiagramLayout`만 쓰고 boot와 **호출 순서·guiData 타이밍** 미검증 | 첫 로드 vs media refresh 결과 불일치 |
| 4 | (덜 가능) 파이프라인 자체 | fold 경로만 깨지고 test-1은 정상이면 1·2 쪽 우선 |

**교훈:** 레이아웃·guiData·store는 **한 태스크·한 파일·한 시나리오 검증** 후 다음 태스크.

---

## 태스크 계획 (README → 노드 안정 → 엣지, 순서 고정)

> 각 태스크 **완료 조건**을 F5에서 확인한 뒤에만 다음으로. 실패 시 **해당 커밋만** revert.

### T0 — 기준선 확인 (코드 변경 없음)

| 항목 | 내용 |
|------|------|
| 목적 | 롤백 후 `b1b2cda`가 정상인지 확인 |
| 확인 | Reload Window → `test-1.json`, `test-4.json` — 계층·스파인·겹침 |
| 실패 시 | `b1b2cda` revert → `a3ae12c` 단일 columnW 스파인으로 후퇴 |

### T1 — dead code 제거 (레이아웃 무관)

| 항목 | 내용 |
|------|------|
| 변경 | `src/panel/containmentPolicy.js` 삭제 (webview는 `model/`만 사용) |
| 위험 | **없음** (require 없음) |
| 확인 | `npm run build` |

### T2 — `MxCellFactory` relative 동기화만

| 항목 | 내용 |
|------|------|
| 변경 | 센터링·겹침 해소 루프에서 `child._nodeData.relativeX/Y` 갱신 |
| 위험 | **낮음** — 렌더 후 자식 위치만 모델과 맞춤 |
| 깨지면 | test-1 PowerTrain 안 형제 간격 이상, 컨테이너 자식 치우침 |
| 확인 | test-1, test-4 (스파인 체인 중앙 정렬) |

### T3 — `applyElkAndRerender`만 boot와 동일 2줄

| 항목 | 내용 |
|------|------|
| 변경 | media 저장 refresh 시 `markCompactContainmentSpines` + `precomputeNodeSizes` **만** 추가 (새 파일 없음) |
| 위험 | **중간** — refresh 경로만 |
| 깨지면 | test-4 JSON 저장 후 스파인 풀림 |
| 확인 | test-4 저장 → 자동 refresh → 7단 스파인 유지 |

### T4 — `layoutPipeline.js` (T3 통과 후)

| 항목 | 내용 |
|------|------|
| 변경 | `runDiagramLayout` 추출, boot·fold·refresh가 호출 |
| 위험 | **중간** — 호출 누락/이중 호출 주의 |
| 확인 | T3 + fold expand/collapse on test-4 |

### T5 — geometry 저장 필터

| 항목 | 내용 |
|------|------|
| 변경 | `diagramVertexUtils` — compartment/decor 제외 후 save |
| 위험 | **중간** — store 키 집합 변경 |
| 깨지면 | 재오픈 시 노드 위치 일부만 복원 |
| 확인 | 노드 드래그 → 저장 → 패널 닫았다 열기 → 위치 유지 (test-1) |

### T6 — guiData spine 스킵 (조건 최소화)

| 항목 | 내용 |
|------|------|
| 변경 | **`_containmentSpineChain`만** x/y/w/h 스킵 (`_tightSingleChildContainer` 전역 스킵 금지) |
| 위험 | **높음** — T1~T5 후에만 |
| 깨지면 | test-1 전체 배치 붕괴 (이전 롤백과 동일) |
| 확인 | test-4 + test-1 둘 다 |

### fix(bddLayout) — test-3·6·7·8·9 빈 화면

| 원인 | `enforceSpecParentAboveChildren`에서 `shiftDescendantsOf(..., visible, ...)` 호출 시 **`visible` 미정의** → `ReferenceError`로 ELK·렌더 중단 |
| 수정 | `const visible = elements.filter(...)` 추가 |
| 부가 | `elkLayout.js` `resolveSiblingOverlaps`·`fitDiagramToMargins` — x,y·relative 이중 가산 제거, 겹침 bbox는 **절대 x,y** 사용 |

**확인:** Reload → test-3,6,7,8,9 · `node scripts/check-bdd-postlayout.mjs`

### fix(bddLayout) — test-5 Bus·Channel 겹침

**관계 (`tests/test-5.json`):**

```text
Bus ──containment──► Channel, ClockPort, DataBusPort (직접 자식 3)
Bus ◄──specialization── I2CBus, SPIBus, UARTBus (루트, Bus 아래 배치)
```

| 원인 | 내용 |
|------|------|
| **스파인 오판** | `getStructuralChildIds`가 포트 제외 → Bus의 구조 자식이 Channel 1개뿐 → `Bus→Channel` 스파인·tight 적용 |
| **순서** | `pack`(가로 3열) 후 `layoutTight`가 Channel 위치를 스파인으로 **덮어씀** → Bus 헤더와 Channel 겹쳐 보임 |
| (부가) | `shiftSpecAncestorsUp` 시 containment 자식 미동반 이동 |

| 수정 | 내용 |
|------|------|
| `isSingleStructuralContainmentParent` | 직접 containment 자식(포트 포함) **2개 이상이면** 스파인·tight 금지 |
| `applyPostLayout` 순서 | spine/tight → **그 다음** `packContainmentChildrenHorizontally` |
| `shiftSpecAncestorsUp` | `shiftDescendantsOf`로 containment 동반 이동 |
| `getBddContainerPads` | 라벨 + **compartment(포트)** 높이 반영한 `innerTop` |
| `ensureContainmentParentsEncloseChildren` | 후처리 끝에 Bus 등 **자식 bbox로 width/height 재계산** (Channel만 element인 경우) |
| `MxCellFactory` | 자식 1개 BDD 컨테이너도 가로 배치·부모 리사이즈, `contentTop`에 compartment 반영 |

### fix(bddLayout) — test-2/5 빈 화면·test-9 spec 자식이 부모 위

| 원인 | 내용 |
|------|------|
| `shiftDescendantsOf`·`pack`·`resolveSiblingOverlaps` | 절대 `x,y`와 `relativeX/Y`에 **같은 delta 이중 가산** → mx 좌표 폭주·뷰포트 밖 |
| `applySpecVerticalBands` | containment 부모는 Y 스킵인데 **밴드 높이만 소모** → 자식이 부모 위 레이어에 배치 (test-9 Storage·Battery 등) |

| 수정 | 내용 |
|------|------|
| `syncRelativeFromAbsolute` | 이동 후 부모 기준으로 relative 재계산 |
| spec 밴드 | 레이어 실제 bottom 기준으로 `bandY` 진행 |
| `enforceSpecParentAboveChildren` | 부모 위로 올리기 + **자식 아래로 내리기** |

**확인:** Reload → test-2, test-5 표시 / test-9 Flywheel·Battery·Renewable이 각 부모 아래

### T-edge — 엣지·노드 관통 회피 (README 직교 품질)

**과거 실패 원인 (요약)**

| 원인 | 증상 |
|------|------|
| `buildOrthogonalPath`가 src/tgt **채널 1개만** 사용 | 중간 노드 bbox 무시 → 관통 |
| `isPathReasonable`이 **넓은 margin**만 검사 | ELK waypoint가 장애물 관통해도 통과 |
| `renderUtils.avoidObstaclesPolyline` | **SVG 전용**, mx `geometry.points` 미연동 |
| 세그먼트당 첫 장애물만 우회·재검증 없음 | 새 세그먼트가 다른 노드 관통 → **더 꺾임** |
| waypoint 무조건 추가 | README 「경로 단순성」 위반 |

**태스크 순서**

| ID | 내용 | 상태 |
|----|------|------|
| T-edge-0 | test-1/2/5 Reload 후 관통 육안·(후속) 교차 카운트 스크립트 | 수동 |
| T-edge-1 | `edgeObstacleUtil.js` — bbox 수집·H/V 교차·`maybeRefinePath` | **완료** |
| T-edge-2 | `MxEdgeBuilder.routeEdge` — ELK·`buildOrthogonalPath` 후 보수적 refine | **완료** |
| T-edge-3 | 채널 Y/X 후보 여러 개 → 교차 최소 선택 | 보류 |
| T-edge-4 | `specEdgeRouter` nested·컨테이너 탈출 경로 | 보류 |
| T-edge-5 | `reroute` 후 2차 검증·앵커 분산과 충돌 여부 | 보류 |

**채택 규칙 (T-edge-2)** — 교차 수가 **감소**하고, 꺾임이 `원본 + maxExtraBends` 이하일 때만 우회 경로 적용. 아니면 **원 경로 유지** (악화 방지).

**설정:** `displaySettings.edgeObstacle` (`obstacleBuffer` 12 등)

### T7+ (보류) — README 엣지 쪽

- `elkLayout` bdd 폴백 중복 제거  
- non-spec 중첩 엣지 컨테이너 회피  
- `isHierarchicalEdgeKind` 공통화  

---

## 2026-05-19 — 연관관계 목록 모달·라벨 링크(🔗)

### 지시

> 연관관계 있는 노드는 이름 우측에 링크 이모지를 넣고, 누르면 리스트 창이 보이게.

### 목표

- association **선은 그리지 않음**(기존 가시성·ELK 정책 유지)
- 데이터는 `model.associations`로 보존해 UI에서만 조회
- 노드 전체 클릭이 아닌 **🔗만** 모달 오픈 (클릭 직후 백드롭 닫힘 방지)

### 수정 (스테이징)

| 파일 | 변경 |
|------|------|
| `src/panel/BlockModelBuilder.js` | association 엣지를 `edges`에서 제외, `associations` 배열로 전달 |
| `media/editor/model/normalizer.js` | 정규화 결과에 `associations` 포함 |
| `media/editor/ui/AssociationListModal.js` | 연관 목록 모달(방향·상대 노드 클릭 시 `selectById`) |
| `media/editor/mxgraph/MxAssociationLink.js` | 렌더 컨텍스트·라벨 🔗 HTML·캡처 클릭 위임 |
| `media/editor/mxgraph/MxLabelUtils.js` | `hasAssociations`/`nodeId`일 때 이름 뒤 링크 삽입 |
| `media/editor/mxgraph/MxVertexBuilder.js` | `formatLabel`에 연관 옵션 전달 |
| `media/editor/mxgraph/MxCellFactory.js` | `prepareRenderContext` / `initGraphClick` |
| `media/editor/mxgraph/MxEventHandler.js` | 노드 클릭 시 모달 자동 오픈 제거, 빈 캔버스 클릭 시 닫기 |
| `media/editor/mxgraph/MxSelectionManager.js` | 다중 선택 시 모달 닫기 |
| `media/sysml-editor.css` | `.association-modal__*` 스타일 |
| `src/HtmlGenerator.js` | `AssociationListModal.js`, `MxAssociationLink.js` 로드 |
| `scripts/debug-test2-spec-penetrate.mjs` | test-2 spec 관통 진단 |
| `scripts/debug-test5-spec-penetrate.mjs` | test-5 spec 관통 진단 |

### 개선 내용

- 연관 끝점이 있는 노드 라벨에만 🔗 표시
- 🔗 클릭 → `AssociationListModal` (Esc·×·빈 캔버스·다중 선택으로 닫기)
- spec 클론(`#__spec__`) ID는 원본·클론 양쪽 lookup

### 확인

- `npm run build` 통과
- Extension Host Reload 후 `test-1.json`, `test-9.json` 등에서 🔗·모달·목록 이동 수동 확인

### 커밋 메시지

```text
feat(ui): 연관관계 노드에 링크 아이콘·목록 모달 추가

- association 엣지는 화면·ELK에 미표시, model.associations로만 보존
- 라벨 이름 우측 🔗 클릭 시 연관 목록 모달, 상대 노드 선택·이동
- 노드 본체 클릭으로 모달이 열리던 동작 제거
- test-2·test-5 spec 관통 진단 스크립트 추가
```

---

## 2026-05-20 — spec 상속 엣지 S면 수평 미끄럼 제거

### 지시

> 엣지가 노드 옆면(특히 부모 S면)을 타고 이동하는 현상 제거. **수직으로 출발·도착**하도록.

### 수정 (스테이징)

| 파일 | 변경 |
|------|------|
| `media/editor/mxgraph/specEdgeRouter.js` | `dedupeOrthoPoints`, `clampYChForNsEntry`, `sanitizeNsSpecPathNoFaceRide` — N→S 통로 `yCh`를 진입면 아래로 고정, 마지막 수평 면주행 시 stub로 교체 |
| 동일 | `buildSpecPath` / `buildColumnSpecPath` / `buildRootToNestedTargetPath`에 `yCh` 클램프 |
| 동일 | `applyExplicitRoute`: 전 경로 sanitize, 2점 보간 시 `(start.x,end.y)` 단일 꺾임 제거 → `(start.x,yCh),(end.x,yCh)` |
| 동일 | `routeSpecEdge`: `refineOrthogonalPath` 직후 sanitize 한 번 더 |

### 개선 내용

- `segmentEdgeStyle` 명시 점에서 **부모 하단 y와 같은 높이의 긴 수평 구간**이 생기던 케이스(2점 L자·refine 결과)를 막고 **S면에는 수직으로만 붙게** 정리.

### 확인

- `read_lints` 통과; 확장 리로드 후 test-5 등 상속선 시각 확인 권장.

### 커밋 메시지

```text
fix(mxgraph): spec N→S 엣지가 부모 면을 타지 않고 수직 진입하도록 정리

- yCh를 진입면 아래·출구면 위로 클램프해 통로가 S면과 겹치지 않게 함
- refine·2점 보간 경로에 대해 면 위 수평 구간이면 stub 꼭짓점으로 치환
- applyExplicitRoute 진입 전 전체 경로 sanitize
```

---

## 보류·참고

| 항목 | 상태 |
|------|------|
| 레이아웃 파이프라인·geometry 일괄 패치 | **롤백됨** — 위 T1~T6 순서로만 재시도 |
| Phase A postLayout / overlap 파이프라인 | stash에만 존재; 형제 `resolveSiblingOverlaps`로 부분 대체 |
| `isSpecializationHierarchyKind` 중복 | elkLayout·MxEdgeBuilder — 공통 유틸 미정리 |
| 커스텀_규칙 「자식 1개 = 화살표」 | 데이터 unnest는 비활성; **스파인 중첩**으로 대체 |
| 다중 상속·깊은 specialization 체인 | test-4 외 시나리오 추가 검증 여지 |

---

## 커밋·브랜치 스냅샷

```text
브랜치: feature/layout-pipeline
b1b2cda  feat(layout): BDD 스파인 깊이별 폭·여백 (HEAD)
a3ae12c  feat(layout): BDD 포함 관계 및 레이아웃 개선 (스파인·containmentPolicy·layout.bdd 보존)
178619d  feat(layout): BDD 자식 가로 한 줄
b161a12  feat(panel): containment 직접 부모 맵
5376fbd  feat(layout): bddLayout·직교 엣지·specEdgeRouter
d63aed4  feat(layout): test-1 specialization 배치·엣지 앵커
d310653  feat: 형제 겹침·compartment padding
… (이하 b12bbc6~8500c3f 동일)
```

---

## 커밋 메시지 (다음 태스크 시)

> 태스크마다 **별도 커밋**. 예: `fix(mxgraph): resizeParents 후 relativeX 동기화 (T2)`  
> **연관관계 UI(2026-05-19):** 위 「연관관계 목록 모달·라벨 링크」절 커밋 메시지 블록 참고.

---

*이 파일은 작업할 때마다 위 형식으로 항목을 추가한다. 작업 묶음이 끝나면 위 「커밋 메시지」 섹션을 갱신한다.*
