enum IterationStatus {
    /**
     * All of the pre-conditions of the Model were met, and
     * the annotater should continue to the next item.
     */
    SUCCESS,

    /**
     * At least one of the preconditions of the Model were not
     * met and the entire document must be re-annotated.
     */
    RETRY_ENTIRE_DOCUMENT,

    /**
     * The precondition is now met, but a line was added somewhere between
     * where the previous line was and idx. The annotater should re-annotate
     * the previous two lines.
     */
    LINE_CREATED,

    /**
     * At least one of the pre-conditions of the Model were not
     * met and the entire line must be re-annotated.
     */
    RETRY_LINE,

    /**
     * At least one of the pre-conditions of the Model were not
     * met and the entire beam must be re-annotated.
     *
     * The Model must be in a beam for this return type to be used.
     */
    RETRY_BEAM,

    /**
     * At least one of the pre-conditions of the Model were not
     * met and an item has been inserted in place of the current
     * item.
     */
    RETRY_CURRENT
}; 

export = IterationStatus;