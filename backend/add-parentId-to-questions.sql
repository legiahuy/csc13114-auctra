-- Add parentId column to questions table for nested comments/replies
ALTER TABLE questions 
ADD COLUMN parentId INT NULL,
ADD CONSTRAINT fk_questions_parent 
  FOREIGN KEY (parentId) 
  REFERENCES questions(id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_questions_parentId ON questions(parentId);
