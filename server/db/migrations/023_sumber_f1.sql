-- Metadata pelaporan; tidak mengubah sasaran, hasil ukur, atau antrean.
CREATE TABLE sumber_f1 (
    anak_id bigint NOT NULL REFERENCES anak(id) ON DELETE CASCADE,
    periode varchar(7) NOT NULL CHECK (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'),
    gng varchar(2) CHECK (gng IN ('G','NG')),
    desil smallint CHECK (desil BETWEEN 1 AND 10),
    asi_eksklusif boolean,
    sumber text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (anak_id, periode)
);
ALTER TABLE sumber_f1 ENABLE ROW LEVEL SECURITY;
