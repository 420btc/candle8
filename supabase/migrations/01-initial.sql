CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL
          );