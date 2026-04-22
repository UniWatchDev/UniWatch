import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { NotesController } from '@/notes/notes.controller';
import { NotesService } from '@/notes/notes.service';

describe('NotesController', () => {
  let controller: NotesController;
  let service: NotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [NotesService]
    }).compile();

    controller = module.get(NotesController);
    service = module.get(NotesService);
  });

  it('POST → create: returns a new note with a UUID and ISO timestamps', () => {
    const note = controller.create({ title: 'Hello', content: 'World' });

    expect(note.title).toBe('Hello');
    expect(note.content).toBe('World');
    expect(note.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(note.createdAt).toBe(note.updatedAt);
    expect(() => new Date(note.createdAt).toISOString()).not.toThrow();
  });

  it('GET → list: returns notes sorted by createdAt desc', async () => {
    const first = controller.create({ title: 'first', content: '1' });
    await new Promise((r) => setTimeout(r, 5));
    const second = controller.create({ title: 'second', content: '2' });

    const list = controller.list();

    expect(list).toHaveLength(2);
    expect(list[0]?.id).toBe(second.id);
    expect(list[1]?.id).toBe(first.id);
  });

  it('GET → get: returns the note when found', () => {
    const created = controller.create({ title: 't', content: 'c' });

    const result = controller.get({ id: created.id });

    expect(result).toEqual(created);
  });

  it('GET → get: throws NotFoundException for unknown id', () => {
    expect(() =>
      controller.get({ id: '00000000-0000-0000-0000-000000000000' })
    ).toThrow(NotFoundException);
  });

  it('PUT → update: replaces title + content and bumps updatedAt', async () => {
    const created = controller.create({ title: 'old', content: 'old' });
    await new Promise((r) => setTimeout(r, 5));

    const updated = controller.update(
      { id: created.id },
      { title: 'new', content: 'new' }
    );

    expect(updated.title).toBe('new');
    expect(updated.content).toBe('new');
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).not.toBe(created.updatedAt);
  });

  it('PATCH → patch: updates only provided fields', async () => {
    const created = controller.create({ title: 'original', content: 'keep' });
    await new Promise((r) => setTimeout(r, 5));

    const patched = controller.patch({ id: created.id }, { title: 'edited' });

    expect(patched.title).toBe('edited');
    expect(patched.content).toBe('keep');
    expect(patched.updatedAt).not.toBe(created.updatedAt);
  });

  it('DELETE → delete: removes the note and returns { success: true }', () => {
    const created = controller.create({ title: 't', content: 'c' });

    const result = controller.delete({ id: created.id });

    expect(result).toEqual({ success: true });
    expect(() => controller.get({ id: created.id })).toThrow(NotFoundException);
  });

  it('DELETE → delete: throws NotFoundException for unknown id', () => {
    expect(() =>
      controller.delete({ id: '00000000-0000-0000-0000-000000000000' })
    ).toThrow(NotFoundException);
  });

  it('wires the service layer (sanity check for DI)', () => {
    expect(service).toBeInstanceOf(NotesService);
  });
});
