# Bootstrap Command - Shared Implementation

This directory contains the **shared implementation** of the Bootstrap command that is used by both **Roo Code** and **Claude** AI agents.

## 🎯 Purpose

The Bootstrap command systematically analyzes codebases to extract project-specific knowledge for AI agents. By centralizing the core logic here, we ensure:

- **DRY Principle**: No duplication of workflow, patterns, techniques, or communication guidelines
- **Consistency**: Both Roo Code and Claude use identical bootstrap logic
- **Maintainability**: Updates to bootstrap logic only need to be made once
- **Extensibility**: Easy to add new AI agents that use the same bootstrap logic

## 📁 File Structure

```
sdlc/shared/commands/bootstrap/
├── README.md                           # This file
├── 1_bootstrap_workflow.xml            # Core workflow definitions
├── 2_knowledge_patterns.xml            # Output templates and structures
├── 3_extraction_techniques.xml         # Analysis techniques and heuristics
└── 4_bootstrap_communication.xml       # Communication guidelines
```

## 🔗 Usage by AI Agents

### Roo Code
- **Command Location**: `sdlc/.roo/commands/bootstrap/`
- **Implementation**: Symlinks to shared files
- **Command File**: `sdlc/.roo/commands/bootstrap.md`

### Claude
- **Command Location**: `sdlc/.claude/commands/bootstrap/`
- **Implementation**: Symlinks to shared files
- **Command File**: `sdlc/.claude/commands/bootstrap.md`

Both agents reference these shared XML files via symlinks:
```bash
sdlc/.roo/commands/bootstrap/1_bootstrap_workflow.xml -> ../../../shared/commands/bootstrap/1_bootstrap_workflow.xml
sdlc/.claude/commands/bootstrap/1_bootstrap_workflow.xml -> ../../../shared/commands/bootstrap/1_bootstrap_workflow.xml
```

## 📝 Shared Files

### 1_bootstrap_workflow.xml
Defines the core bootstrap workflows:
- **Initial Bootstrap**: Extract project knowledge from scratch
- **Knowledge Verification**: Validate existing artifacts against current codebase

Contains:
- Initialization phase steps
- Analysis focus areas
- Workflow paths for extraction and verification
- Completion criteria
- Integration with SDLC modes

### 2_knowledge_patterns.xml
Provides templates for structuring extracted knowledge:
- Bootstrap main document template
- Technology stack documentation format
- Architecture documentation patterns
- Code convention templates
- Pattern documentation (DO/DON'T examples)
- Anti-pattern documentation
- Integration pattern templates
- Testing and configuration patterns

### 3_extraction_techniques.xml
Systematic techniques for analyzing codebases:
- Architecture analysis techniques
- Technology stack analysis
- Convention extraction methods
- Pattern discovery techniques
- Anti-pattern identification
- Integration analysis
- Security and performance analysis
- Quality indicators

### 4_bootstrap_communication.xml
Guidelines for user interaction and output formatting:
- User interaction patterns
- Progress update formats
- Findings communication templates
- Markdown formatting standards
- Cross-reference conventions
- Documentation tone guidelines
- Completion message templates

## 🔄 Maintenance

When updating bootstrap logic:

1. **Edit shared files** in `sdlc/shared/commands/bootstrap/`
2. Changes automatically apply to both Roo Code and Claude
3. No need to update multiple locations
4. Test with both AI agents to ensure compatibility

## ⚠️ Important Notes

- **Never edit symlinks directly** - always edit the source files in `sdlc/shared/commands/bootstrap/`
- **Agent-specific customizations** go in the respective `.md` files (`sdlc/.roo/commands/bootstrap.md` or `sdlc/.claude/commands/bootstrap.md`)
- **Core logic must remain agent-agnostic** - shared files should work for any AI agent

## 🚀 Adding New AI Agents

To add bootstrap support for a new AI agent:

1. Create agent command directory: `sdlc/.[agent]/commands/bootstrap/`
2. Create symlinks to shared files:
   ```bash
   cd sdlc/.[agent]/commands/bootstrap/
   ln -s ../../../shared/commands/bootstrap/1_bootstrap_workflow.xml
   ln -s ../../../shared/commands/bootstrap/2_knowledge_patterns.xml
   ln -s ../../../shared/commands/bootstrap/3_extraction_techniques.xml
   ln -s ../../../shared/commands/bootstrap/4_bootstrap_communication.xml
   ```
3. Create agent-specific `bootstrap.md` with appropriate command syntax
4. Update references to point to shared location: `../../shared/commands/bootstrap/`

## 📊 Benefits of This Architecture

✅ **Single Source of Truth**: Core bootstrap logic exists in one place  
✅ **Reduced Maintenance**: Fix bugs once, benefit everywhere  
✅ **Consistency**: All agents follow identical bootstrap methodology  
✅ **Scalability**: Easy to add new AI agents  
✅ **Version Control**: Track changes to bootstrap logic in one location  
✅ **Testing**: Test shared logic once for all agents  

---

**Last Updated**: 2025-11-26  
**Maintained By**: SDLC Template Team