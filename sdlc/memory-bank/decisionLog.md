# Decision Log

This file records architectural and implementation decisions.

## Decision Template

### [Date] - [Decision Title]

**Context:** [What is the situation and context?]

**Decision:** [What is the decision that was made?]

**Rationale:** [Why was this decision made?]

**Consequences:** [What are the positive and negative consequences?]

---

**Template Instructions:** Use the template above to record architectural and implementation decisions as your project develops. Replace bracketed placeholders with actual decision information.

### [2025-10-17 02:42:00] - Memory Bank Enforcement Architecture Implementation

**Context:** SDLC template needed strict enforcement to prevent architectural violations where modes rationalize using incorrect memory banks (e.g., using SDLC memory bank for Main App work or vice versa).

**Decision:** Implemented comprehensive Memory Bank Enforcement rules in [`sdlc/.roomodes`](sdlc/.roomodes:16) with zero-tolerance policies for architectural violations.

**Rationale:** 
- Previous instructions assumed compliance but didn't enforce hard stops when violations occurred
- Modes were rationalizing architectural compromises instead of refusing incorrect contexts
- Need mandatory verification and refusal protocols to maintain architectural integrity
- Critical to prevent context bleeding between SDLC tooling work and Main App development work

**Consequences:**
- **Positive:** Strict architectural boundary enforcement, no more rationalization of violations, clear escalation paths for resolution, consistent behavior across all modes
- **Negative:** Modes will refuse to work without proper memory bank context, may require more upfront setup, stricter operational requirements

**Implementation:** Added enforcement rules to all 7 custom modes with identical language covering prohibition against rationalization, mandatory existence checks, hard stop enforcement, zero tolerance for substitution, and required escalation protocols.

### [2025-10-17 08:52:00] - Repository URL Updated from GitHub to GitLab

**Context:** The clone command in the README.md was pointing to GitHub but should point to GitLab for the correct repository location.

**Decision:** Updated the git clone URL in [`sdlc/README.md`](sdlc/README.md:29) from `https://github.com/jb-brown/sdlc-template.git` to `https://gitlab.com/jb-brown/sdlc-template.git`.

**Rationale:** 
- Ensures users clone from the correct repository location
- Maintains consistency with the actual repository hosting platform
- Prevents setup errors and confusion during initial template deployment

**Consequences:**
- **Positive:** Users will now clone from the correct GitLab repository, reducing setup errors and confusion
- **Negative:** None identified - this is a straightforward documentation correction

### [2025-10-18 13:09:00] - Individual Mode Copy Architecture for setup-sdlc Script

**Context:** The setup-sdlc script was copying entire `.roomodes` file and `.roo` directory, which would overwrite any existing custom modes in the target project directory, potentially causing users to lose their existing mode configurations.

**Decision:** Modified the setup script in [`setup-sdlc.sh`](setup-sdlc.sh:69) to implement intelligent `.roomodes` merging that updates template modes while preserving custom modes, plus individual mode rule directory copying without backup files.

**Rationale:**
- Previous wholesale copy approach destroyed existing custom modes
- Users may have additional modes beyond the SDLC template
- Need to preserve user customizations while deploying updated template modes
- Git already provides version control, making backup files unnecessary file pollution
- Template mode slugs contain placeholder tokens (`project-online-spec`) that resolve to actual project names (`myproject-spec`) in target
- Individual mode copying allows selective updates without destroying existing modes
- Intelligent merging updates existing template modes while preserving any custom modes

**Consequences:**
- **Positive:** Existing custom modes are completely preserved, template modes are updated with latest definitions, universal rules are updated consistently, no file tree pollution with backup files, git handles all versioning needs, proper slug matching handles placeholder token resolution
- **Negative:** More complex merging logic using awk for YAML manipulation

**Implementation:** Intelligent merging process that identifies template mode slugs (accounting for `project-online` substitution), removes existing template modes from target `.roomodes`, appends updated template modes from source, preserves all custom modes, plus copying individual `.roo/rules-*` directories and updating `universal-rules`.

### [2025-10-18 13:43:00] - Extended Intelligent Merging to deployment.yaml Scripts

**Context:** After implementing intelligent `.roomodes` merging in the setup script, the [`sdlc/deployment.yaml`](sdlc/deployment.yaml:24) also contained wholesale copy commands that would overwrite existing custom modes during SDLC-to-parent deployment operations.

**Decision:** Extended the intelligent merging approach from setup-sdlc script to the deployment commands in [`sdlc/deployment.yaml`](sdlc/deployment.yaml:24), implementing the same slug-based template mode replacement while preserving custom modes.

**Rationale:**
- Deployment.yaml scripts are used by Roo modes to deploy from SDLC directory to parent directory
- Same problem existed: wholesale copy would destroy existing custom modes in parent directory
- Need consistency between setup script and deployment script behaviors
- Template mode slugs contain same placeholder tokens requiring resolution
- Both scripts should preserve custom modes while updating template modes

**Consequences:**
- **Positive:** Consistent behavior between setup and deployment operations, existing custom modes preserved during SDLC deployments, template modes updated reliably, no mode loss during operations
- **Negative:** More complex deployment commands in YAML configuration

**Implementation:** Modified [`sdlc/deployment.yaml`](sdlc/deployment.yaml:24) deployment_commands to use multi-line bash scripts that implement the same awk-based YAML merging logic as setup script, plus updated usage instructions to reflect intelligent merging behavior.
