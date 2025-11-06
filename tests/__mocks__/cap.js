module.exports = {
  Cap: jest.fn().mockImplementation(() => {
    return {
      open: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
    };
  }),
  decoders: {
    PROTOCOL: {
      ETHERNET: {
        IPV4: 2048,
      },
      IP: {
        TCP: 6,
      },
    },
    Ethernet: jest.fn(),
    IPV4: jest.fn(),
    TCP: jest.fn(),
  },
};
