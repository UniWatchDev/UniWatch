import type { ReactNode } from 'react';

interface RoomFormSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}

export function RoomFormSection({
  eyebrow,
  title,
  description,
  children,
}: RoomFormSectionProps) {
  return (
    <section className="room-form-section">
      <div className="room-form-section__header">
        {eyebrow != null && eyebrow.length > 0 && (
          <p className="room-form-section__eyebrow">{eyebrow}</p>
        )}
        <h2 className="room-form-section__title">{title}</h2>
        {description != null && description.length > 0 && (
          <p className="room-form-section__description">{description}</p>
        )}
      </div>
      <div className="room-form-section__body">{children}</div>
    </section>
  );
}
