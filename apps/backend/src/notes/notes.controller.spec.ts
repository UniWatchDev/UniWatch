import {
  ForbiddenException,
  NotFoundException
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import type { Note } from '@repo/schemas/notes';
import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { NotesController } from '@/notes/notes.controller';
import { NotesService } from '@/notes/notes.service';
import { NoteRepository } from '@/notes/note.repository';

const mockUserId = new Types.ObjectId().toString();

function authReq(sub: string = mockUserId): Request {
  return { authPayload: { sub, email: 'u@u.com', pv: 1 } } as Request;
}

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

const mockRepo = {
  findAllForOwner: jest.fn(),
  findById: jest.fn(),
  findOwnedById: jest.fn(),
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
        { provide: NoteRepository, useValue: mockRepo as unknown as NoteRepository }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(NotesController);
  });

  it('POST → create: returns the note from the repository', async () => {
    const note = makeNote({ title: 'Hello', content: 'World' });
    jest.mocked(mockRepo.create).mockResolvedValue(note);

    const result = await controller.create(authReq(), {
      title: 'Hello',
      content: 'World'
    });

    expect(result).toEqual(note);
    expect(mockRepo.create).toHaveBeenCalledWith(mockUserId, {
      title: 'Hello',
      content: 'World'
    });
  });

  it('GET → list: returns notes from the repository', async () => {
    const notes = [makeNote({ title: 'A' }), makeNote({ title: 'B' })];
    jest.mocked(mockRepo.findAllForOwner).mockResolvedValue(notes);

    const result = await controller.list(authReq());

    expect(result).toHaveLength(2);
    expect(mockRepo.findAllForOwner).toHaveBeenCalledWith(mockUserId);
  });

  it('GET → get: returns the note when found', async () => {
    const note = makeNote();
    jest.mocked(mockRepo.findOwnedById).mockResolvedValue(note);

    const result = await controller.get(authReq(), { id: note.id });

    expect(result).toEqual(note);
  });

  it('GET → get: throws NotFoundException for unknown id', async () => {
    jest.mocked(mockRepo.findOwnedById).mockResolvedValue(null);
    jest.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(
      controller.get(authReq(), { id: '00000000-0000-0000-0000-000000000000' })
    ).rejects.toThrow(NotFoundException);
  });

  it('GET → get: throws ForbiddenException when note exists but is not owned', async () => {
    jest.mocked(mockRepo.findOwnedById).mockResolvedValue(null);
    jest.mocked(mockRepo.findById).mockResolvedValue({} as never);

    await expect(
      controller.get(authReq(), { id: '00000000-0000-0000-0000-000000000000' })
    ).rejects.toThrow(ForbiddenException);
  });

  it('DELETE → delete: returns { success: true }', async () => {
    jest.mocked(mockRepo.delete).mockResolvedValue(true);

    const result = await controller.delete(authReq(), { id: randomUUID() });

    expect(result).toEqual({ success: true });
  });

  it('DELETE → delete: throws NotFoundException for unknown id', async () => {
    jest.mocked(mockRepo.delete).mockResolvedValue(false);
    jest.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(
      controller.delete(authReq(), { id: '00000000-0000-0000-0000-000000000000' })
    ).rejects.toThrow(NotFoundException);
  });
});
