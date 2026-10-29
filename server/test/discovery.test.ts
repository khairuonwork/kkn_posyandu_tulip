import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ambilDaftarTabletAktif, catatHeartbeatTablet } from "../src/http/discovery.ts";

describe("deteksi heartbeat tablet", () => {
    test("memisahkan aplikasi lama yang memakai ID bersama berdasarkan IP", () => {
        catatHeartbeatTablet("198.51.100.20", {
            deviceId: "tablet-posyandu",
            namaPerangkat: "Tablet Posyandu Tulip",
        });
        catatHeartbeatTablet("198.51.100.21", {
            deviceId: "tablet-posyandu",
            namaPerangkat: "Tablet Posyandu Tulip",
        });

        const tabletLama = ambilDaftarTabletAktif().filter((tablet) =>
            tablet.deviceId.startsWith("tablet-posyandu@198.51.100."),
        );

        assert.equal(tabletLama.length, 2);
        assert.deepEqual(
            tabletLama.map((tablet) => tablet.ip).sort(),
            ["198.51.100.20", "198.51.100.21"],
        );
    });

    test("ID unik dari versi aplikasi baru tetap menghitung perangkat terpisah", () => {
        catatHeartbeatTablet("198.51.100.22", {
            deviceId: "tablet-instansi-a1b2",
            namaPerangkat: "Tablet Posyandu A1B2",
        });

        const tablet = ambilDaftarTabletAktif().find(
            (item) => item.deviceId === "tablet-instansi-a1b2",
        );

        assert.equal(tablet?.namaPerangkat, "Tablet Posyandu A1B2");
        assert.equal(tablet?.status, "online");
    });
});
