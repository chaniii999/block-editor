# 작업 로그 (Work Log)

SELab Block Editor — `feature/layout-pipeline` 브랜치 기준.  
지시 사항 · 수정 파일 · 개선 의도를 시간순으로 기록한다.

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

### 수정 (미커밋 · `MxCompartmentRenderer.js` / `MxCellFactory.js`)

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

## 보류·참고

| 항목 | 상태 |
|------|------|
| Phase A postLayout / overlap 파이프라인 | stash에만 존재; 형제 `resolveSiblingOverlaps`로 부분 대체 |
| `isSpecializationHierarchyKind` 중복 | elkLayout·MxEdgeBuilder — 공통 유틸 미정리 |
| 다중 상속·깊은 specialization 체인 | test-4 외 시나리오 추가 검증 여지 |

---

## 커밋·브랜치 스냅샷

```text
브랜치: feature/layout-pipeline
8500c3f  test: verify block JSON …
b12bbc6  fix: association edge 미표시
9fc9ab2  docs: work-log + 스테레오타입 UI
2c50073  feat: FeatureTyping 푸터
b32cb22  feat: AttributeDefinition compartment
938630f  feat: 헤더 verticalAlign top
e5114d9  feat: specialization ELK 상하 계층
437378f  feat: JSON/media 자동 리프레시
d310653  feat: 형제 겹침 해소·compartment padding 정합 (HEAD)
```

---

*이 파일은 작업할 때마다 위 형식으로 항목을 추가한다.*
