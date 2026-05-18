# README 과제를 고치려면 — 코드 어디를 보면 되는지 + 용어집

이 문서는 **코딩을 잘 모르는 분**도, README에 적힌 **직교 엣지 품질** 과제를 이해하고 “어느 파일을 열어야 하는지” 찾을 수 있게 정리했습니다.  
**최종 기준은 저장소 루트의 `README.md`**입니다. 여기 내용과 충돌하면 README를 따르세요.

---

## 1. 한눈에: 그림이 만들어지는 순서

1. **VS Code**가 JSON 파일을 읽습니다 (`tests/test-1.json` 등).
2. **`BlockModelBuilder.js`**에서 데이터를 정리합니다 (어떤 관계를 화면에 남길지 등).
3. **웹뷰** 안에서 **`elkLayout.js`**가 대부분의 **노드 위치·간격**을 자동으로 잡습니다 (ELK 엔진).
4. **`bddLayout.js`**가 BDD용으로 **노드 배치를 한 번 더** 손봅니다 (특히 상속과 관련된 배치).
5. **`MxCellFactory.js`** 등이 **mxGraph**로 사각형(노드)과 선(엣지)을 **실제로 그립니다**.
6. **상속 선**은 **`specEdgeRouter.js`**가, 그 외 많은 선은 **`MxEdgeBuilder.js`**가 **꺾인 경로**를 정합니다.
7. **직교를 공통으로 강제**하는 규칙은 **`edgeOrthogonalPolicy.js`**와 **`displaySettings.js`**에 있습니다.

즉, “선이 왜 이렇게 꺾이지?”는 대부분 **5~7번 파일**이고, “박스가 왜 여기 있지?”는 **3~4번**입니다.

---

## 2. README 품질 기준 → 대략 어디를 고치면 되는지

README 표의 **말 그대로의 뜻**과, 이 저장소에서 **먼저 볼 코드 위치**를 연결했습니다.

| README에 나온 말 | 쉬운 뜻 | 주로 볼 코드 (경로는 저장소 루트 기준) |
| --- | --- | --- |
| 선 교차 최소화 | 선들이 서로 덜 엇갈리게 | `media/editor/layout/elkLayout.js` (간격·배치), `media/editor/mxgraph/specEdgeRouter.js` / `MxEdgeBuilder.js` (선 경로) |
| 노드 겹침 없음 | 사각형이 서로 겹치지 않게 | `elkLayout.js`, `media/editor/layout/bddLayout.js` |
| 엣지-노드 중첩 없음 | 선이 엉뚱한 박스 안을 가로지르지 않게 | `specEdgeRouter.js`, `MxEdgeBuilder.js` |
| 엣지 경로 단순성 | 꺾임·돌아가기 최소 | 위와 동일 |
| 균일한 간격 | 박스 사이 간격이 비슷하게 | `media/editor/config/displaySettings.js`의 `elk.*`, `bdd.*` 숫자, `elkLayout.js` |
| 계층적 배치 | 위가 부모·아래가 자식처럼 보이게 | `bddLayout.js`, `elkLayout.js` |
| 엣지 종단 명확성 | 선이 박스 **테두리**에 딱 붙게 | `specEdgeRouter.js`, `MxEdgeBuilder.js`, `edgeOrthogonalPolicy.js` |
| 대칭성 | 형제 노드가 좌우로 고르게 | `bddLayout.js`, ELK 옵션 (`displaySettings.js`) |

---

## 3. “상속 선”만 따로 있다는 점 (헷갈리기 쉬움)

- JSON의 **`specialization`** (상속, 화살표 있는 일반화 관계)은 **ELK가 선을 그리지 않습니다.**  
  `elkLayout.js` 안에서 ELK 그래프의 엣지 목록에 **넣지 않도록** 되어 있습니다.
- 대신 화면의 **상속 선 경로**는 **`specEdgeRouter.js`**가 담당합니다.
- 그래서 **`elk.edgeRouting: 'ORTHOGONAL'`** 같은 설정은 **ELK가 처리하는 다른 관계(예: containment로 잡힌 배치 등)**에는 영향을 주지만, **상속 선의 모양 전부**를 ELK 한 줄로 해결하진 않습니다.

**상속 선 품질만 고치고 싶다** → `specEdgeRouter.js` (+ 필요 시 `bddLayout.js`로 노드 위치).

---

## 4. 파일 이름만 빠르게 (역할 한 줄)

| 파일 | 한 줄 설명 |
| --- | --- |
| `README.md` | 과제 목표·품질 기준의 **기준서** |
| `tests/test-1.json` 등 | 시험용 입력 데이터 |
| `src/panel/BlockModelBuilder.js` | JSON을 화면용 모델로 바꿀 때 규칙 (예: 어떤 엣지를 뺄지) |
| `src/HtmlGenerator.js` | 웹뷰에 어떤 JS 파일을 **순서대로** 넣는지 |
| `media/editor/boot.js` | 웹뷰 부팅, 새로고침 시 ELK 다시 돌리기·그래프 다시 그리기 |
| `media/editor/layout/elkLayout.js` | **ELK**로 노드 배치·(일부) 엣지 처리 |
| `media/editor/layout/bddLayout.js` | ELK 뒤 **BDD 전용** 노드 배치 보정 |
| `media/editor/config/displaySettings.js` | ELK·BDD·직교 정책 **숫자·스위치** 모음 |
| `media/editor/mxgraph/MxCellFactory.js` | 전체 그림(모델)을 mxGraph에 **한 번에 그리기** |
| `media/editor/mxgraph/MxVertexBuilder.js` | **노드(박스)** 하나 생성 |
| `media/editor/mxgraph/MxEdgeBuilder.js` | **엣지(선)** 생성·라우팅 (상속 제외한 쪽 많음) |
| `media/editor/mxgraph/specEdgeRouter.js` | **상속(specialization)** 선만 직교 라우팅 |
| `media/editor/mxgraph/edgeOrthogonalPolicy.js` | “선은 직교로” **공통 규칙** |
| `media/editor/mxgraph/MxStyleManager.js` | 선 색·화살표·기본 스타일 문자열 |
| `media/editor/mxgraph/MxGraphWrapper.js` | mxGraph 그래프 객체 설정 |

SVG로만 그리는 예전 경로(`media/editor/render/…`)는, 설정상 **mxGraph가 켜져 있으면** BDD 메인 화면과는 별개입니다.

---

## 5. 전문 용어집 (이 다이어그램·이 과제에서 자주 나오는 말)

### 5.1 제품·형식

| 용어 | 뜻 |
| --- | --- |
| **VS Code 확장 (Extension)** | 이 프로젝트가 동작하는 형태. 에디터 안에 “블록 다이어그램” 패널을 띄웁니다. |
| **웹뷰 (Webview)** | 확장 안에서 돌아가는 작은 웹 페이지. **실제 캔버스(그림)**는 여기서 그려집니다. |
| **JSON** | 노드·연결 정보를 적은 텍스트 파일. `tests/*.json`이 예시입니다. |
| **mxGraph** | 브라우저에서 다이어그램을 그리는 라이브러리 이름입니다. 박스·선·드래그 등을 담당합니다. |

### 5.2 그림의 구성 요소

| 용어 | 뜻 |
| --- | --- |
| **노드 (Node)** | 화면의 사각형(블록). JSON의 `nodes` 한 줄이 대개 하나에 해당합니다. |
| **엣지 (Edge)** | 노드와 노드를 잇는 **선**. JSON의 `edges` 한 줄이 하나입니다. |
| **컨테이너 (Container)** | 큰 박스 안에 다른 박스가 들어가 있는 구조. 포함 관계로 만들어집니다. |
| **포트 (Port)** | 블록 가장자리의 작은 연결점(도형). 이 프로젝트 JSON에도 `portdefinition` 등이 있습니다. |

### 5.3 JSON / SysML 쪽 `kind` (과제 샘플에 나오는 값)

| 용어 (`kind`) | 뜻 |
| --- | --- |
| **partdefinition** | “이런 부품(블록) 타입이 있다”는 정의. |
| **partusage** | 정의된 타입을 **쓰는** 인스턴스 표현에 가깝습니다. |
| **portdefinition** | 포트의 종류 정의. |
| **attributedefinition** | 속성(숫자·문자 필드) 정의. |
| **specialization** | **상속**(일반화): JSON에서는 보통 **자식이 `source`, 부모가 `target`**. 화살표는 UML 관례에 맞게 그려집니다. |
| **containment** | **포함**: 부모 박스가 자식을 “품는” 구조. 레이아웃에 큰 영향을 줍니다. |
| **featuretyping** | 어떤 요소가 어떤 타입을 따른다는 식의 타이핑(과제 JSON에 따라 표시 방식이 다를 수 있음). |
| **association** | 연관(참조). 이 저장소의 BDD 뷰에서는 **선으로 안 그리도록 필터**되는 경우가 있습니다(과제·빌더 설정 따름). |

### 5.4 레이아웃·알고리즘

| 용어 | 뜻 |
| --- | --- |
| **레이아웃 (Layout)** | 노드를 **어디에 둘지** 자동으로 정하는 것. |
| **ELK** / **ELK Layered** | 자동 배치 엔진 이름. `elkLayout.js`가 브라우저에서 이걸 부릅니다. |
| **`elk.edgeRouting: ORTHOGONAL`** | ELK가 **자기 그래프 안의 엣지**를 직각으로 깔끔하게 놓으려 할 때 쓰는 옵션입니다. **상속 선은 ELK 엣지에 안 들어가므로** 이 옵션만으로 상속 선이 해결되지는 않습니다. |
| **후처리 (Post-layout)** | ELK가 끝난 뒤, 우리 코드가 좌표를 **한 번 더** 고치는 단계. `bddLayout.js`가 여기에 해당합니다. |

### 5.5 선(엣지) 그리기

| 용어 | 뜻 |
| --- | --- |
| **직교 (Orthogonal)** | 선이 **수평·수직만**으로 이어지는 것. README 과제의 핵심입니다. |
| **라우팅 (Routing)** | 선이 **어디를 지나가며 꺾일지** 계산하는 것. |
| **웨이포인트 (Waypoint)** | 선이 꺾이는 **중간 점**들. mxGraph는 `geometry.points`에 저장합니다. |
| **앵커 (Anchor)** | 선이 노드 **테두리의 어느 지점**에 붙는지 (위/아래/좌/우 비율 등). `exitX`, `entryY` 같은 스타일로 표현됩니다. |
| **edgeStyle** | mxGraph가 선을 그리는 **방식** 이름(예: `orthogonalEdgeStyle`, `segmentEdgeStyle`). |
| **segmentEdgeStyle** | 중간 점을 우리가 정하면 **그 꺾임대로만** 그리는 방식. 상속 라우터에서 씁니다. |
| **guiData** | 사용자가 노드를 옮긴 위치를 저장해 두었다가 다시 열 때 복원하는 데이터. `boot.js` 등에서 다룹니다. |

### 5.6 README 품질 표에 나온 말 (영어 그대로 쓸 때)

| 용어 | 뜻 |
| --- | --- |
| **Crossing minimization** | 선끼리 교차를 줄이는 것. |
| **Overlap** | 노드가 서로 겹침. |
| **Edge-node overlap** | 선이 **관계 없는** 박스 위를 지나감. |
| **Path simplicity** | 불필요한 꺾임·U자·버스(한 줄에 몰림)를 줄임. |
| **Symmetric placement** | 형제 노드를 좌우 대칭에 가깝게 배치. |

---

## 6. 숫자만 손대고 싶을 때

`media/editor/config/displaySettings.js` 안의 **`elk`** 블록(노드 간격, 레이어 간격 등)과 **`bdd`** 블록(spec 관련 간격)을 조절하면, 코드 깊게 안 들어가도 **전체 밀도**가 바뀝니다.

직교 강제를 끄고 싶다면 같은 파일(`displaySettings` 객체 안)에 예를 들어 다음을 **추가**합니다. (`edgeOrthogonalPolicy.js`가 이 값을 읽습니다. 없으면 기본은 직교 강제 ON입니다.)

```js
edgeRouting: {
    forceOrthogonal: false,
},
```

---

## 7. 정리

- **README의 “표 안 품질”을 선 위주로 맞추려면** → `specEdgeRouter.js` + `MxEdgeBuilder.js` + `edgeOrthogonalPolicy.js`.  
- **박스 위치·간격**을 맞추려면 → `displaySettings.js` + `elkLayout.js` + `bddLayout.js`.  
- **어떤 관계가 아예 그려지는지**를 바꾸려면 → `BlockModelBuilder.js` + `visibilityFilter.js` (및 README 범위 확인).

문서 끝.
