import { ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { config } from '../config.js';

/**
 * Kelas pembantu untuk membuat container Discord Components V2 layaknya EmbedBuilder tradisional.
 */
export class V2Embed {
  constructor() {
    this.title = '';
    this.description = '';
    this.accentColor = config.embedColor; // Menggunakan warna default dari global config
    this.actionRows = [];
  }

  /**
   * Mengatur judul untuk V2 Embed
   * @param {string} title 
   * @returns {this}
   */
  setTitle(title) {
    this.title = title;
    return this;
  }

  /**
   * Mengatur deskripsi/isi utama untuk V2 Embed
   * @param {string} description 
   * @returns {this}
   */
  setDescription(description) {
    this.description = description;
    return this;
  }

  /**
   * Mengatur warna garis aksen samping container
   * @param {number} color Nilai warna hex (misalnya 0x00ffd2 atau 16711680)
   * @returns {this}
   */
  setColor(color) {
    this.accentColor = color;
    return this;
  }

  /**
   * Menambahkan baris komponen (seperti tombol/button) langsung di dalam container embed
   * @param {import('discord.js').ActionRowBuilder} actionRow 
   * @returns {this}
   */
  addActionRow(actionRow) {
    this.actionRows.push(actionRow);
    return this;
  }

  /**
   * Merender builder menjadi objek ContainerBuilder yang siap dikirim
   * @returns {ContainerBuilder}
   */
  build() {
    const container = new ContainerBuilder();
    
    if (this.accentColor !== null) {
      container.setAccentColor(this.accentColor);
    }

    let markdown = '';
    if (this.title) {
      markdown += `## ${this.title}\n\n`;
    }
    if (this.description) {
      markdown += this.description;
    }

    if (markdown.trim() !== '') {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(markdown)
      );
    }

    // Masukkan semua baris tombol/komponen langsung di dalam container
    for (const row of this.actionRows) {
      container.addActionRowComponents(row);
    }

    return container;
  }
}
