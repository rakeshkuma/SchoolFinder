package com.indiaschoolfinder.config;

import org.springframework.boot.autoconfigure.transaction.TransactionManagerCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;

/**
 * Outside a real transaction (the Propagation.NOT_SUPPORTED practice paths), no EntityManager is bound for the whole
 * method. Bound, it keeps its database connection while JdbcTemplate takes a second one, so a burst of submissions
 * larger than the connection pool would deadlock until it timed out.
 */
@Configuration
public class TransactionConfig {

    @Bean
    TransactionManagerCustomizer<AbstractPlatformTransactionManager> synchronizeOnlyRealTransactions() {
        return manager -> manager.setTransactionSynchronization(AbstractPlatformTransactionManager.SYNCHRONIZATION_ON_ACTUAL_TRANSACTION);
    }
}
