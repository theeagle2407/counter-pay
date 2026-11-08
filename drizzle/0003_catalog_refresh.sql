-- Hide the former free edition without deleting claims or purchased file access.
UPDATE listings SET active = 0 WHERE title = 'Weekend Notes · limited free edition' AND amount_luna = 0;
-- Existing paid orders retain their identifiers and access after the display name changes.
UPDATE listings SET title = 'Weekend Notes' WHERE title = 'Weekend Notes · paid edition' AND amount_luna = 100000;
