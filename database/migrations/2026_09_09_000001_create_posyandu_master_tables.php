<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('teams', function (Blueprint $table) {
            $table->string('rw', 3)->nullable()->after('slug');
            $table->string('kelurahan')->nullable()->after('rw');
        });

        Schema::create('wilayah_rt', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->cascadeOnDelete();
            // Teks, bukan integer: menjaga bentuk "01".
            $table->string('rt', 3);
            $table->string('rw', 3);
            $table->timestamps();

            $table->unique(['team_id', 'rt', 'rw']);
        });

        Schema::create('orang_tua', function (Blueprint $table) {
            $table->id();
            // NIK adalah natural key, bukan primary key. Boleh kosong.
            // Lihat docs/adr/0001-primary-key-strategy.md.
            $table->string('nik', 16)->nullable()->unique();
            $table->string('nama');
            $table->timestamps();

            $table->index('nama');
        });

        Schema::create('anak', function (Blueprint $table) {
            $table->id();
            $table->string('nik', 16)->nullable()->unique();
            $table->foreignId('orang_tua_id')->nullable()->constrained('orang_tua')->nullOnDelete();
            $table->foreignId('wilayah_rt_id')->nullable()->constrained('wilayah_rt')->nullOnDelete();
            $table->string('nama');
            // Nama yang sudah dibakukan; dipakai untuk pencarian dan pencocokan impor.
            $table->string('nama_baku');
            $table->date('tgl_lahir');
            $table->string('jk', 1);
            $table->unsignedTinyInteger('anak_ke')->nullable();
            // Kilogram. Nilai bersatuan gram dari arsip menjadi konflik impor,
            // bukan dikonversi diam-diam.
            $table->decimal('bb_lahir_kg', 5, 2)->nullable();
            $table->decimal('pb_lahir_cm', 5, 1)->nullable();
            $table->boolean('buku_kia')->default(false);
            $table->boolean('imd')->default(false);
            $table->string('status', 20)->default('aktif');
            $table->timestamps();
            $table->softDeletes();

            $table->index('nama_baku');
            $table->index('tgl_lahir');
            $table->index(['wilayah_rt_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('anak');
        Schema::dropIfExists('orang_tua');
        Schema::dropIfExists('wilayah_rt');

        Schema::table('teams', function (Blueprint $table) {
            $table->dropColumn(['rw', 'kelurahan']);
        });
    }
};
