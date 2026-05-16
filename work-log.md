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

### 수정 (미커밋, 작업 트리)

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

### 수정 (미커밋)

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

---

## 보류·참고

| 항목 | 상태 |
|------|------|
| Phase A postLayout / overlap 파이프라인 | stash에만 존재, 현재 브랜치 미적용 |
| 레이아웃 전반 깨짐 이슈 | `8500c3f` 복귀 후 association·스테레오타입만 단계 적용 중 |
| 다음 지시(예상) | 연관관계 2번 항목, 계층/겹침 최소 수정 등 사용자 추가 지시 대기 |

---

## 커밋·브랜치 스냅샷

```text
브랜치: feature/layout-pipeline
8500c3f  test: verify block JSON …
b12bbc6  fix: association edge 미표시
(HEAD)   + 스테레오타입 변경 미커밋
```

---

*이 파일은 작업할 때마다 위 형식으로 항목을 추가한다.*
