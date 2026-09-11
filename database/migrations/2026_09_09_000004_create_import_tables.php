<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_batch', function (Blueprint $table) {
            $table->id();
            $table->string('sumber_file');
            $table->string('sheet')->nullable();
            $table->foreignId('dijalankan_oleh')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('dijalankan_pada');
            $table->json('ringkasan');
            $table->timestamps();
        });

        Schema::create('import_konflik', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_batch_id')->constrained('import_batch')->cascadeOnDelete();
            $table->unsignedInteger('baris_asal');
            $table->string('jenis', 30);
            $table->json('payload');
            $table->string('status', 12)->default('terbuka');
            $table->timestamps();

            $table->index(['import_batch_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_konflik');
        Schema::dropIfExists('import_batch');
    }
};
