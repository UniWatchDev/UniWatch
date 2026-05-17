import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Note } from '@repo/schemas/notes';
import { randomUUID } from 'node:crypto';
import { NotesController } from '@/notes/notes.controller';
import { NotesService } from '@/notes/notes.service';
import { NoteRepository } from '@/notes/note.repository';

function makeNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    title: 'Test',
    content: 'Content',
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

const mockRepo: Partial<NoteRepository> = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn()
};

describe('NotesController', () => {
  let controller: NotesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [
        NotesService,
        { provide: NoteRepository, useValue: mockRepo }
      ]
    }).compile();

    controller = module.get(NotesController);
  });

  it('POST → create: returns the note from the repository', async () => {
    const note = makeNote({ title: 'Hello', content: 'World' });
    jest.mocked(mockRepo.create!).mockResolvedValue(note);

    const result = await controller.create({ title: 'Hello', content: 'World' });

    expect(result).toEqual(note);
  });

  it('GET → list: returns notes from the repository', async () => {
    const notes = [makeNote({ title: 'A' }), makeNote({ title: 'B' })];
    jest.mocked(mockRepo.findAll!).mockResolvedValue(notes);

    const result = await controller.list();

    expect(result).toHaveLength(2);
  });

  it('GET → get: returns the note when found', async () => {
    const note = makeNote();
    jest.mocked(mockRepo.findById!).mockResolvedValue(note);

    const result = await controller.get({ id: note.id });

    expect(result).toEqual(note);
  });

  it('GET → get: throws NotFoundException for unknown id', async () => {
    jest.mocked(mockRepo.findById!).mockResolvedValue(null);

    await expect(
      controller.get({ id: '00000000-0000-0000-0000-000000000000' })
    ).rejects.toThrow(NotFoundException);
  });

  it('DELETE → delete: returns { success: true }', async () => {
    jest.mocked(mockRepo.delete!).mockResolvedValue(true);

    const result = await controller.delete({ id: randomUUID() });

    expect(result).toEqual({ success: true });
  });

  it('DELETE → delete: throws NotFoundException for unknown id', async () => {
    jest.mocked(mockRepo.delete!).mockResolvedValue(false);

    await expect(
      controller.delete({ id: '00000000-0000-0000-0000-000000000000' })
    ).rejects.toThrow(NotFoundException);
  });
});
