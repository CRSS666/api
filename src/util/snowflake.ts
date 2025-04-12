import { Snowflake } from 'nodejs-snowflake';

const snowflake = new Snowflake({
  custom_epoch: new Date('2023-07-10T00:00:00Z').getTime(),
  instance_id: 1
});

export default snowflake;
