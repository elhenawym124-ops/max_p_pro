const { Client } = require('pg');

async function createFunction() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'max',
        password: '0165676135',
        port: 5432,
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL');

        await client.query(`
      CREATE OR REPLACE FUNCTION cosine_similarity(a float8[], b float8[]) RETURNS float8 AS $$
      DECLARE
          dot_product float8 := 0;
          norm_a float8 := 0;
          norm_b float8 := 0;
      BEGIN
          IF array_length(a, 1) IS NULL OR array_length(b, 1) IS NULL THEN
              RETURN 0;
          END IF;
          
          FOR i IN 1..LEAST(array_length(a, 1), array_length(b, 1)) LOOP
              dot_product := dot_product + (a[i] * b[i]);
              norm_a := norm_a + (a[i] * a[i]);
              norm_b := norm_b + (b[i] * b[i]);
          END LOOP;
          
          IF norm_a = 0 OR norm_b = 0 THEN
              RETURN 0;
          END IF;
          
          RETURN dot_product / (sqrt(norm_a) * sqrt(norm_b));
      END;
      $$ LANGUAGE plpgsql;
    `);

        console.log('✅ Custom cosine_similarity function created');
    } catch (err) {
        console.error('❌ Failed to create function:', err.message);
    } finally {
        await client.end();
    }
}

createFunction();
