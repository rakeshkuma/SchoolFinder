package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.auth.LoginRequest;
import com.indiaschoolfinder.dto.auth.TokenResponse;

public interface AuthService {

    TokenResponse login(LoginRequest request);
}
