# Release candidate: @signalsafe/tree-spec-editor-core 0.2.4

The published baseline is 0.2.3. Update normal registry dependencies and frozen locks to the verified TreeSpec 0.4.5 maintenance line while preserving domain-neutral authoring helpers. Existing public exports and runtime behavior remain compatible. The source was reconciled with current remote refactors and additional regression tests while preserving original uncommitted work separately.

The coordinated normal-registry dependency sequence is TreeSpec 0.4.5, editor-core 0.2.4, editor-react 0.3.4, then the deliberately breaking editor-shell 0.5.0 export rename. Theme 0.3.8 is CSS-only and compatible. This package does not add an application domain, storage or provider boundary; hosts retain authorization, persistence and custom field controls.

Run strict types, full package tests with their existing enforced coverage thresholds and actual packed-consumer checks. React graph documentation images must be regenerated and pass their source fingerprint gate after dependency or metadata changes. Existing hosted checks, Sonar and exact archive/version tags remain release requirements. Candidate metadata alone is not publication or host-adoption evidence.
