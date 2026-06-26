// Minimal smoke test — full integration covered in e2e
import { FriendRequestRepository } from './friend-request.repository';

describe('FriendRequestRepository', () => {
  it('should be defined', () => {
    // Instantiation tested via module setup — this verifies exports compile
    expect(FriendRequestRepository).toBeDefined();
  });
});
