import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { NoteRecord, NoteSchema } from '@/notes/note.schema';
import { NoteRepository } from '@/notes/note.repository';
import { NotesController } from '@/notes/notes.controller';
import { NotesService } from '@/notes/notes.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: NoteRecord.name, schema: NoteSchema }])],
  controllers: [NotesController],
  providers: [NotesService, NoteRepository]
})
export class NotesModule {}
