import { configureJest } from '@run-z/project-config';

export default await configureJest({
  moduleNameMapper: {
    '^esgen$': '<rootDir>/src/mod.ts',
  },
});
