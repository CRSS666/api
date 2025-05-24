enum Permission {
  Admin = 1 << 0,

  ViewQueue = 1 << 1,
  EditQueue = 1 << 2,

  EditConfig = 1 << 3,
  EditServers = 1 << 4
}

export default Permission;
