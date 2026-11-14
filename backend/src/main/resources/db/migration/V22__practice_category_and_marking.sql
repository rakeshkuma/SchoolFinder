-- Practice sets are grouped by the kind of exam they prepare for, and each set states its own marking: marks for a
-- correct answer and marks deducted for a wrong one (skipped questions never lose marks). Existing sets keep the
-- scoring they had (one mark, nothing deducted) and are all entrance-test practice.
ALTER TABLE practice_set
    ADD COLUMN category           VARCHAR(20)  NOT NULL DEFAULT 'ENTRANCE',
    ADD COLUMN marks_per_question NUMERIC(4,2) NOT NULL DEFAULT 1,
    ADD COLUMN negative_marks     NUMERIC(4,2) NOT NULL DEFAULT 0,
    ADD CONSTRAINT ck_practice_category CHECK (category IN ('SCHOOL', 'ENTRANCE', 'OLYMPIAD', 'COMPETITIVE')),
    ADD CONSTRAINT ck_practice_marks CHECK (marks_per_question > 0 AND marks_per_question <= 10),
    ADD CONSTRAINT ck_practice_negative CHECK (negative_marks >= 0 AND negative_marks <= marks_per_question);

-- Members' attempts record the marks scored (NULL for attempts saved before marking existed).
ALTER TABLE practice_attempt
    ADD COLUMN marks     NUMERIC(7,2),
    ADD COLUMN max_marks NUMERIC(7,2);
