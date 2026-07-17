export type RegisterContactMode = "phone" | "email";

export type RegisterPayloadInput = {
  identityEnabled: boolean;
  contactMode: RegisterContactMode;
  nickname: string;
  email: string;
  phone: string;
  password: string;
};

export type LoginPayloadInput = {
  identityEnabled: boolean;
  identifier: string;
  email: string;
  password: string;
};

export function defaultRegisterContactMode(identityEnabled: boolean): RegisterContactMode {
  return identityEnabled ? "phone" : "email";
}

export function buildRegisterPayload(input: RegisterPayloadInput) {
  const base = {
    nickname: input.nickname,
    password: input.password
  };

  if (!input.identityEnabled || input.contactMode === "email") {
    return {
      ...base,
      email: input.email
    };
  }

  return {
    ...base,
    phone: input.phone
  };
}

export function buildLoginPayload(input: LoginPayloadInput) {
  if (input.identityEnabled) {
    return {
      identifier: input.identifier,
      password: input.password
    };
  }

  return {
    email: input.email || input.identifier,
    password: input.password
  };
}
