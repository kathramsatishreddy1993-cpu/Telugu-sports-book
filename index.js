/* =========================================================
   ADMIN RESET LOGIN PASSWORD

   POST /api/admin/customers/:id/reset-login-password
========================================================= */

app.post(
  '/api/admin/customers/:id/reset-login-password',

  async (req, res) => {
    try {
      const customerId =
        Number(req.params.id);

      const newPassword =
        String(
          req.body.password ||
          req.body.newPassword ||
          req.body.temporaryPassword ||
          ''
        );

      if (
        !Number.isInteger(customerId) ||
        customerId <= 0
      ) {
        return res.status(400).json({
          error: 'Invalid customer ID.',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error:
            'New Login Password must contain at least 6 characters.',
        });
      }

      const customerResult =
        await pool.query(
          `
          SELECT
            id,
            name,
            login_id,
            withdrawal_password_hash
          FROM customers
          WHERE id = $1
          LIMIT 1
          `,
          [customerId]
        );

      if (customerResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Customer account not found.',
        });
      }

      const customer =
        customerResult.rows[0];

      if (customer.withdrawal_password_hash) {
        const sameAsWithdrawal =
          await bcrypt.compare(
            newPassword,
            customer.withdrawal_password_hash
          );

        if (sameAsWithdrawal) {
          return res.status(400).json({
            error:
              'Login Password and Withdrawal Password must be different.',
          });
        }
      }

      const passwordHash =
        await bcrypt.hash(
          newPassword,
          12
        );

      const result =
        await pool.query(
          `
          UPDATE customers
          SET
            password_hash = $1,
            must_change_password = TRUE,
            updated_at = NOW()
          WHERE id = $2
          RETURNING
            id,
            name,
            login_id,
            must_change_password,
            withdrawal_password_hash,
            must_change_withdrawal_password,
            status,
            created_at
          `,
          [
            passwordHash,
            customerId,
          ]
        );

      return res.json({
        success: true,
        message:
          'Login Password reset successfully. Customer must change it after login.',
        customer:
          publicCustomer(
            result.rows[0]
          ),
      });
    } catch (error) {
      console.error(
        'Admin Reset Login Password Error:',
        error
      );

      return res.status(500).json({
        error:
          'Unable to reset Login Password.',
      });
    }
  }
);

/* =========================================================
   ADMIN RESET WITHDRAWAL PASSWORD

   POST /api/admin/customers/:id/reset-withdrawal-password
========================================================= */

app.post(
  '/api/admin/customers/:id/reset-withdrawal-password',

  async (req, res) => {
    try {
      const customerId =
        Number(req.params.id);

      const newPassword =
        String(
          req.body.password ||
          req.body.newPassword ||
          req.body.temporaryPassword ||
          req.body.temporaryWithdrawalPassword ||
          ''
        );

      if (
        !Number.isInteger(customerId) ||
        customerId <= 0
      ) {
        return res.status(400).json({
          error: 'Invalid customer ID.',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error:
            'New Withdrawal Password must contain at least 6 characters.',
        });
      }

      const customerResult =
        await pool.query(
          `
          SELECT
            id,
            name,
            login_id,
            password_hash
          FROM customers
          WHERE id = $1
          LIMIT 1
          `,
          [customerId]
        );

      if (customerResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Customer account not found.',
        });
      }

      const customer =
        customerResult.rows[0];

      const sameAsLogin =
        await bcrypt.compare(
          newPassword,
          customer.password_hash
        );

      if (sameAsLogin) {
        return res.status(400).json({
          error:
            'Login Password and Withdrawal Password must be different.',
        });
      }

      const passwordHash =
        await bcrypt.hash(
          newPassword,
          12
        );

      const result =
        await pool.query(
          `
          UPDATE customers
          SET
            withdrawal_password_hash = $1,
            must_change_withdrawal_password = TRUE,
            updated_at = NOW()
          WHERE id = $2
          RETURNING
            id,
            name,
            login_id,
            must_change_password,
            withdrawal_password_hash,
            must_change_withdrawal_password,
            status,
            created_at
          `,
          [
            passwordHash,
            customerId,
          ]
        );

      return res.json({
        success: true,
        message:
          'Withdrawal Password reset successfully. Customer must change it before use.',
        customer:
          publicCustomer(
            result.rows[0]
          ),
      });
    } catch (error) {
      console.error(
        'Admin Reset Withdrawal Password Error:',
        error
      );

      return res.status(500).json({
        error:
          'Unable to reset Withdrawal Password.',
      });
    }
  }
);
