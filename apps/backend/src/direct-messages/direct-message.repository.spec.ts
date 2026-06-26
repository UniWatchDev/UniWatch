// Minimal smoke test — full integration covered in e2e
import { DirectMessageRepository } from './direct-message.repository';

describe('DirectMessageRepository', () => {
  it('should be defined', () => {
    // Instantiation tested via module setup — this verifies exports compile
    expect(DirectMessageRepository).toBeDefined();
  });
});
