/* ********************************************************************************
 * Copyright: SELab.AI (c) 2026
 * EdgeTypeMapping.js - Syson-aligned edge tool policy mapping
 * ********************************************************************************/
(function () {
    'use strict';

    const ns = (window.SELAB = window.SELAB || {});
    ns.MxGraph = ns.MxGraph || {};

    const KIND_LABELS = {
        PartUsage: 'Part',
        PartDefinition: 'Part',
        PortUsage: 'Port',
        PortDefinition: 'Port',
        ActionUsage: 'Action',
        ActionDefinition: 'Action',
        AttributeUsage: 'Attribute',
        AttributeDefinition: 'Attribute',
        ItemUsage: 'Item',
        ItemDefinition: 'Item',
        RequirementUsage: 'Requirement',
        RequirementDefinition: 'Requirement',
        AllocationUsage: 'Allocation',
        AllocationDefinition: 'Allocation',
        InterfaceUsage: 'Interface',
        InterfaceDefinition: 'Interface',
        UseCaseUsage: 'Use Case',
        UseCaseDefinition: 'Use Case',
        StateUsage: 'State',
        StateDefinition: 'State',
        ConstraintUsage: 'Constraint',
        ConstraintDefinition: 'Constraint',
        OccurrenceDefinition: 'Occurrence',
        MetadataDefinition: 'Metadata',
        Package: 'Package',
        Namespace: 'Namespace',
        ControlNode: 'Control Node',
    };

    const TOOL_DEFS = {
        new_dependency: {
            label: 'New Dependency',
            edgeType: 'dependency',
            drawTemporaryEdge: true,
        },
        new_subclassification: {
            label: 'New Subclassification',
            edgeType: 'specialization',
            drawTemporaryEdge: true,
        },
        new_specialization: {
            label: 'New Specialization',
            edgeType: 'specialization',
            drawTemporaryEdge: true,
        },
        new_redefinition: {
            label: 'New Redefinition',
            edgeType: 'redefinition',
            drawTemporaryEdge: true,
        },
        new_subsetting: {
            label: 'New Subsetting',
            edgeType: 'subsetting',
            drawTemporaryEdge: true,
        },
        new_allocation: {
            label: 'New Allocation',
            edgeType: 'allocation',
            drawTemporaryEdge: true,
        },
        new_feature_typing: {
            label: 'New Feature Typing',
            edgeType: 'featuretyping',
            drawTemporaryEdge: true,
        },
        new_succession: {
            label: 'New Succession',
            edgeType: 'succession',
            drawTemporaryEdge: true,
        },
        new_transition_usage: {
            label: 'New Transition',
            edgeType: 'succession',
            drawTemporaryEdge: true,
        },
        include_use_case: {
            label: 'New Include Use Case',
            edgeType: 'dependency',
            drawTemporaryEdge: true,
        },
        become_objective_requirement: {
            label: 'Become objective Requirement',
            edgeType: 'dependency',
            drawTemporaryEdge: true,
        },
    };

    function normalizeKind(kind) {
        return String(kind || '').trim();
    }

    function isUsageKind(kind) {
        return /Usage$/.test(kind);
    }

    function isSuccessionTargetKind(kind) {
        return kind === 'ActionUsage' || 
               kind === 'ControlNode' || 
               kind.includes('ActionUsage') || 
               ['Done', 'Join', 'Fork', 'Merge', 'Decision', 'DoneAction', 'JoinAction', 'ForkAction', 'MergeAction', 'DecisionAction'].includes(kind);
    }

    function isDefinitionKind(kind) {
        return /Definition$/.test(kind);
    }

    function isSpecialActionKind(kind) {
        const k = String(kind || '').toLowerCase();
        // startaction/doneaction은 succession 타깃으로 허용 (new_dependency 차단 제외)
        return k.includes('joinaction')
            || k.includes('forkaction') || k.includes('mergeaction') || k.includes('decisionaction');
    }

    function isRegularTargetKind(kind) {
        return !!kind && !isSpecialActionKind(kind);
    }

    function isControlNodeKind(kind) {
        const k = String(kind || '').toLowerCase();
        return k === 'controlnode' || k.includes('decisionnode') || k.includes('forknode')
            || k.includes('joinnode') || k.includes('mergenode')
            || k === 'startaction' || k === 'doneaction';
    }

    function isSuccessionTarget(kind) {
        const k = String(kind || '').toLowerCase();
        return k.includes('action') || k.includes('controlnode') || k.includes('state')
            || k.includes('decisionnode') || k.includes('forknode')
            || k.includes('joinnode') || k.includes('mergenode');
    }

    function getDefinitionKindFromUsage(kind) {
        if (!isUsageKind(kind)) return '';
        return kind.replace(/Usage$/, 'Definition');
    }

    function getKindLabel(kind) {
        return KIND_LABELS[kind] || String(kind || '');
    }

    function createBecomeNestedItem(sourceKind) {
        const noun = getKindLabel(sourceKind);
        return {
            id: `become_nested_${String(sourceKind || '').toLowerCase()}`,
            type: 'become_nested',
            edgeType: 'composition',
            label: `Become nested ${noun}`,
            drawTemporaryEdge: false,
        };
    }

    function addTool(items, id) {
        const def = TOOL_DEFS[id];
        if (!def) return;
        if (!items.some(i => i.id === id)) {
            items.push({
                id,
                type: id,
                edgeType: def.edgeType,
                label: def.label,
                drawTemporaryEdge: def.drawTemporaryEdge !== false,
            });
        }
    }

    function addBecomeNested(items, sourceKind, targetKind) {
        const source = normalizeKind(sourceKind);
        const target = normalizeKind(targetKind);
        if (!source || !target) return;

        const isUsage = isUsageKind(target);
        const withoutPortAttr = target !== 'PortUsage' && target !== 'AttributeUsage';

        let allowBecome = false;

        switch (source) {
            case 'AllocationUsage':
                allowBecome = isUsage || target === 'AllocationDefinition';
                break;
            case 'AttributeUsage':
                allowBecome = isUsage || target === 'MetadataDefinition' || target === 'OccurrenceDefinition' || target === 'AttributeDefinition';
                break;
            case 'ConstraintUsage':
                allowBecome = (isUsage || target === 'ConstraintDefinition') && withoutPortAttr;
                break;
            case 'InterfaceUsage':
                allowBecome = (isUsage || target === 'InterfaceDefinition') && withoutPortAttr;
                break;
            case 'ItemUsage':
                allowBecome = (isUsage || target === 'ItemDefinition' || target === 'PartDefinition') && withoutPortAttr;
                break;
            case 'PartUsage':
                allowBecome = (isUsage || target === 'OccurrenceDefinition' || target === 'PartDefinition') && withoutPortAttr;
                break;
            case 'PortUsage':
                allowBecome = isUsage || target === 'PortDefinition';
                break;
            case 'RequirementUsage':
                allowBecome = (isUsage || target === 'RequirementDefinition') && withoutPortAttr;
                break;
            default:
                break;
        }

        if (allowBecome) items.push(createBecomeNestedItem(source));
    }

    /**
     * Return Syson-style edge tool list for a source/target node-kind pair.
     * @param {string} sourceKind
     * @param {string} targetKind
     * @returns {{ id: string, type: string, edgeType: string, label: string, drawTemporaryEdge: boolean }[]}
     */
    function getAvailableEdgeTypes(sourceKind, targetKind) {
        const source = normalizeKind(sourceKind);
        const target = normalizeKind(targetKind);
        const items = [];

        if (!source || !target) {
            addTool(items, 'new_dependency');
            return items;
        }

        if (source === 'Package' || source === 'Namespace') {
            addTool(items, 'new_dependency');
            return items;
        }

        if (isDefinitionKind(source)) {
            // ActionDefinition/PartDefinition 컨테이너 내부에서 드래그 시작 시
            // target이 action/control node면 succession 허용 (SySon 동일)
            if (isSuccessionTarget(target)) {
                addTool(items, 'new_succession');
                return items;
            }
            addTool(items, 'new_dependency');
            if (target === source) addTool(items, 'new_subclassification');
            addBecomeNested(items, source, target);
            return items;
        }

        if (source === 'ControlNode' || isControlNodeKind(source)) {
            if (isSuccessionTarget(target)) {
                addTool(items, 'new_succession');
                // ControlNode ↔ ActionUsage 간 전이 허용
                if (target === 'ActionUsage' || target === 'AcceptActionUsage') {
                    addTool(items, 'new_transition_usage');
                }
            }
            return items;
        }

        if (isUsageKind(source)) {
            if (isRegularTargetKind(target)) addTool(items, 'new_dependency');
            if (target === source) {
                addTool(items, 'new_redefinition');
                addTool(items, 'new_subsetting');
            }
            if (isUsageKind(target)) addTool(items, 'new_allocation');

            const definitionKind = getDefinitionKindFromUsage(source);
            if (definitionKind && target === definitionKind) {
                addTool(items, 'new_feature_typing');
            }

            if (source === 'AcceptActionUsage' || source === 'ActionUsage'
                || source === 'ControlNode' || isControlNodeKind(source)) {
                if (isSuccessionTarget(target)) {
                    addTool(items, 'new_succession');
                    // ActionUsage ↔ ActionUsage 간 전이 허용
                    if (target === 'ActionUsage' || target === 'AcceptActionUsage') {
                        addTool(items, 'new_transition_usage');
                    }
                }
            }
            if (source === 'StateUsage' && target === 'StateUsage') {
                addTool(items, 'new_transition_usage');
            }
            if (source === 'UseCaseUsage' && target === 'UseCaseUsage') {
                addTool(items, 'include_use_case');
            }
            if (source === 'RequirementUsage' && (target === 'UseCaseUsage' || target === 'UseCaseDefinition')) {
                addTool(items, 'become_objective_requirement');
            }

            addBecomeNested(items, source, target);
        }

        if (items.length === 0) {
            addTool(items, 'new_dependency');
            addTool(items, 'new_feature_typing');
        }

        return items;
    }

    ns.MxGraph.edgeTypeMapping = {
        getAvailableEdgeTypes,
        TOOL_DEFS,
        KIND_LABELS,
    };

    console.log('[EdgeTypeMapping] module loaded');
})();
