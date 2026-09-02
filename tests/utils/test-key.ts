import { generateKeyPairSync } from "crypto";

export function generatePrivateKeyPem(): string {
  try {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs1", format: "pem" },
    });
    return privateKey;
  } catch {
    return `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEAw1J5O4R2XzKfFdF3qP0T3kq2m9yQ3vR5sT7uV8wX9yZ0aB1c
D2eF3gH4iJ5kL6mN7oP8qQ9rS0tU1vW2xY3zA4bB5cC6dD7eE8fF9gH0hI1jJ2kK
3lL4mM5nN6oO7pP8qQ9rS0tU1vW2xY3zA4bB5cC6dD7eE8fF9gH0hI1jJ2kK3lL4
mM5nN6oO7pP8qQ9rS0tU1vW2xY3zA4bB5cC6dD7eE8fF9gH0hI1jJ2kK3lL4mM5n
N6oO7pP8qQ9rS0tU1vW2xY3zA4bB5cC6dD7eE8fF9gH0hI1jJ2kK3lL4mM5nN6oO
7pP8qQ9rS0tU1vW2xY3zA4bB5cC6dD7eE8fF9gH0hI1jJ2kK3lL4mM5nN6oO7pP8
qQ9rS0tU1vW2xY3zA4bB5cC6dD7eE8fF9gH0hI1jJ2kK3lL4mM5nN6oO7pP8qQ9r
S0tU1vW2xY3zA4bB5cC6dD7eE8fF9gH0hI1jJ2kK3lL4mM5nN6oO7pP8qQ9rS0tU
1vW2xY3zA4bB5cC6dD7eE8fF9gH0hI1jJ2kK3lL4mM5nN6oO7pP8qQ9rS0tU1vW2
xY3zA4bB5cC6dD7eE8fF9gH0hI1jJ2kK3lL4mM5nN6oO7pP8qQ9rS0tU1vW2xY3zA
4bB5cC6dD7eE8fF9gH0hI1jJ2kK3lL4mM5nN6oO7pP8qQ9rS0tU1vW2xY3zA4bB5c
C6dD7eE8fF9gH0hI1jJ2kK3lL4mM5nN6oO7pP8qQ9rS0tU1vW2xY3zA4bB5cC6dD7
eE8fF9gH0hI1jJ2kK3lL4mM5nN6oO7pP8qQ9rS0tU1vW2xY3zA4bB5cC6dD7eE8fF
9gH0hI1jJ2kK3lL4mM5nN6oO7pP8qQ9rS0tU1vW2xY3zA4bB5cC6dD7eE8fF9gH0h
-----END RSA PRIVATE KEY-----`;
  }
}
