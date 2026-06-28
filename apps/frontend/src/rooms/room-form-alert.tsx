interface RoomFormAlertProps {
  message: string;
}

export function RoomFormAlert({ message }: RoomFormAlertProps) {
  return (
    <div className="room-form-alert" role="alert">
      {message}
    </div>
  );
}
