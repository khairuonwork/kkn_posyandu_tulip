-- Kunci grup Nearby per Posyandu. Endpoint hanya menerbitkannya kepada akun
-- aktif yang punya penugasan pada Posyandu tersebut.
CREATE TABLE IF NOT EXISTS posyandu_cluster (
    posyandu_id bigint PRIMARY KEY REFERENCES posyandu (id) ON DELETE CASCADE,
    cluster_key char(64) NOT NULL,
    key_version integer NOT NULL DEFAULT 1,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT posyandu_cluster_key_hex CHECK (cluster_key ~ '^[0-9a-f]{64}$')
);
