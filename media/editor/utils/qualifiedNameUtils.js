/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * QualifiedName 파싱 유틸리티 (Browser 환경)
 * 
 * Language Server의 qualified-name-utils.js와 동일한 기능을 제공하되
 * 브라우저 환경(ES5/ES6 호환)에 맞게 작성되었습니다.
 * ********************************************************************************/

(function () {
    const ns = (window.SELAB = window.SELAB || {});
    ns.Editor = ns.Editor || {};
    ns.Editor.utils = ns.Editor.utils || {};

    /**
     * qualifiedName을 세그먼트 배열로 분리
     * @param {string} qualifiedName - 분리할 경로
     * @param {boolean} filterEmpty - 빈 세그먼트 제거 여부 (기본값: true)
     * @returns {string[]} 세그먼트 배열
     */
    function parseQualifiedName(qualifiedName, filterEmpty) {
        if (filterEmpty === undefined) filterEmpty = true;
        if (!qualifiedName) return [];
        
        var segments = String(qualifiedName).split('::');
        
        if (filterEmpty) {
            return segments.filter(function(s) { 
                return s && s.trim().length > 0; 
            });
        }
        
        return segments;
    }

    /**
     * qualifiedName의 중첩 깊이 계산
     * @param {string} qualifiedName - 경로
     * @returns {number} 깊이
     */
    function getQualifiedNameDepth(qualifiedName) {
        return parseQualifiedName(qualifiedName).length;
    }

    /**
     * qualifiedName에서 부모 경로 추출
     * @param {string} qualifiedName - 경로
     * @returns {string} 부모 경로
     */
    function getParentQualifiedName(qualifiedName) {
        var segments = parseQualifiedName(qualifiedName);
        
        if (segments.length <= 1) {
            return '';
        }
        
        segments.pop();
        return segments.join('::');
    }

    /**
     * qualifiedName에서 마지막 세그먼트 추출
     * @param {string} qualifiedName - 경로
     * @returns {string} 마지막 세그먼트
     */
    function getLastSegment(qualifiedName) {
        var segments = parseQualifiedName(qualifiedName);
        return segments.length > 0 ? segments[segments.length - 1] : '';
    }

    /**
     * qualifiedName에서 첫 번째 세그먼트(Package) 추출
     * @param {string} qualifiedName - 경로
     * @returns {string} 첫 번째 세그먼트
     */
    function getPackageName(qualifiedName) {
        var segments = parseQualifiedName(qualifiedName);
        return segments.length > 0 ? segments[0] : '';
    }

    /**
     * 요소가 특정 부모 내부에 중첩되어 있는지 확인
     * @param {string} qualifiedName - 경로
     * @param {number} minDepth - 최소 중첩 깊이 (기본값: 3)
     * @returns {boolean} 중첩 여부
     */
    function isNestedElement(qualifiedName, minDepth) {
        if (minDepth === undefined) minDepth = 3;
        return getQualifiedNameDepth(qualifiedName) >= minDepth;
    }

    /**
     * 두 경로가 같은 부모를 가지는지 확인
     * @param {string} path1 - 첫 번째 경로
     * @param {string} path2 - 두 번째 경로
     * @returns {boolean} 같은 부모 여부
     */
    function haveSameParent(path1, path2) {
        var parent1 = getParentQualifiedName(path1);
        var parent2 = getParentQualifiedName(path2);
        return parent1 && parent2 && parent1 === parent2;
    }

    /**
     * 경로가 특정 접미사로 끝나는지 확인
     * @param {string} fullPath - 전체 경로
     * @param {string} suffixPath - 접미사 경로
     * @returns {boolean} 매칭 여부
     */
    function endsWithPath(fullPath, suffixPath) {
        var fullSegments = parseQualifiedName(fullPath);
        var suffixSegments = parseQualifiedName(suffixPath);
        
        if (suffixSegments.length === 0 || fullSegments.length < suffixSegments.length) {
            return false;
        }
        
        var fullEndSegments = fullSegments.slice(-suffixSegments.length);
        return fullEndSegments.join('::') === suffixSegments.join('::');
    }

    /**
     * 경로 목록에서 특정 접미사와 매칭되는 경로 찾기
     * @param {Array} paths - 검색할 경로 목록
     * @param {string} targetPath - 찾을 경로
     * @returns {string|null} 매칭된 경로
     */
    function findPathBySuffix(paths, targetPath) {
        for (var i = 0; i < paths.length; i++) {
            if (endsWithPath(paths[i], targetPath)) {
                return paths[i];
            }
        }
        return null;
    }

    /**
     * 경로에서 특정 깊이까지의 세그먼트만 추출
     * @param {string} qualifiedName - 경로
     * @param {number} depth - 추출할 깊이
     * @returns {string} 잘린 경로
     */
    function truncateToDepth(qualifiedName, depth) {
        var segments = parseQualifiedName(qualifiedName);
        return segments.slice(0, depth).join('::');
    }

    /**
     * 경로가 특정 부모 경로로 시작하는지 확인
     * @param {string} fullPath - 전체 경로
     * @param {string} parentPath - 부모 경로
     * @returns {boolean} 시작 여부
     */
    function startsWithPath(fullPath, parentPath) {
        var fullSegments = parseQualifiedName(fullPath);
        var parentSegments = parseQualifiedName(parentPath);
        
        if (parentSegments.length === 0 || fullSegments.length < parentSegments.length) {
            return false;
        }
        
        var fullStartSegments = fullSegments.slice(0, parentSegments.length);
        return fullStartSegments.join('::') === parentSegments.join('::');
    }

    // Public API
    ns.Editor.utils.QualifiedNameUtils = {
        parseQualifiedName: parseQualifiedName,
        getQualifiedNameDepth: getQualifiedNameDepth,
        getParentQualifiedName: getParentQualifiedName,
        getLastSegment: getLastSegment,
        getPackageName: getPackageName,
        isNestedElement: isNestedElement,
        haveSameParent: haveSameParent,
        endsWithPath: endsWithPath,
        findPathBySuffix: findPathBySuffix,
        truncateToDepth: truncateToDepth,
        startsWithPath: startsWithPath
    };
})();
