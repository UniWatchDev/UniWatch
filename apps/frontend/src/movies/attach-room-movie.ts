import { API_BASE_URL } from '@repo/consts/api';
import { updateRoomContract } from '@repo/contracts/rooms';
import type { MovieResponse } from '@repo/schemas/movies';
import type { RoomResponse } from '@repo/schemas/rooms';

import { readHttpErrorMessage } from '@/auth/auth-fetch-helpers';

type AttachRoomMovieOptions = {
  movieName?: string;
  movieDescription?: string | null;
};

export async function attachMovieToRoom(
  roomId: string,
  movie: MovieResponse,
  options: AttachRoomMovieOptions = {}
): Promise<RoomResponse> {
  const movieDescription = options.movieDescription ?? movie.description;
  const body = updateRoomContract.bodySchema.parse({
    movie: movie.id,
    movie_name: options.movieName ?? movie.name,
    ...(movieDescription === null ? {} : { movie_description: movieDescription }),
  });
  const path = updateRoomContract.path.replace(':id', encodeURIComponent(roomId));
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: updateRoomContract.method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(await readHttpErrorMessage(res));
  }

  return updateRoomContract.responseSchema.parse(await res.json());
}
