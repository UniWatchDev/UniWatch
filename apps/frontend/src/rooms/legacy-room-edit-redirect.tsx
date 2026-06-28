import { Navigate, useParams } from 'react-router-dom';

export function LegacyRoomEditRedirect() {
  const { id } = useParams<{ id: string }>();
  if (id === undefined) {
    return <Navigate to="/rooms" replace />;
  }
  return <Navigate to={`/room/${id}/edit`} replace />;
}
