import jwt, { JwtPayload } from "jsonwebtoken";
import jwtDecode from "jwt-decode";
import {jwtSecret, postService, userService} from "../config"
import e, {Router, Request, Response, NextFunction} from "express";
import { zodLoginRequest } from "../models/login/login-request";
import {zodRegisterRequest} from "../models/register/register-request";
import { HttpError } from "../errors/http-error";
import { ErrorCode } from "../errors/error-codes";
import { LoginResponse } from "../models/login/login-response";
import { AuthorizedUser } from "../models/profile/authorized-user";
import { zodProfileDto } from "../models/profile/edit-profile-dto";
import {FollowRequest, zodFollowRequest} from "../models/follow/follow-request";
import {FollowingersRequest, zodFollowingersRequest} from "../models/follow/followingers-request";
import {Followinger} from "../models/follow/followinger";
import { authMiddleware } from "../middlewares/auth-middleware";

export const userRouter = Router();

userRouter.post("/signup", async (req, res, next) => {
    try {
        const registerRequest = zodRegisterRequest.parse(req.body);
        const loginResponse = await userService.signup(registerRequest);
        if (!loginResponse) {
            throw new HttpError(401, ErrorCode.UNAUTHORIZED, "Not authorized");
        }
        res.status(200).cookie("bearer", loginResponse.token, {maxAge: loginResponse.expireTime}).send(loginResponse.user);
    } catch(err) {
        next(err);
    }
});

userRouter.post("/login", async (req, res, next) => {
    try{
        const loginRequest = zodLoginRequest.parse(req.body);
        const loginResponse = await userService.login(loginRequest);
        if (!loginResponse) {
            throw new HttpError(401, ErrorCode.INVALID_USERNAME_OR_PASSWORD, "Username or password incorrect");
        }
        res.cookie("bearer", loginResponse.token, {maxAge: loginResponse.expireTime}).status(201).send(loginResponse.user);
    } catch(err) {
        next(err);
    }
});

userRouter.use(authMiddleware);

userRouter.get("/profile/:userName", async (req: Request, res, next) => {
    try {
        if (!req.user) {
            throw new HttpError(401, ErrorCode.UNAUTHORIZED, "Not authorized");
        }
        const profile = await userService.getProfile(req.params.userName, req.user.userName);
        res.status(200).send(JSON.stringify(profile));
    } catch (err) {
        next(err);
    }
});

userRouter.get("/check-username/:userName", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userName } = req.params;

        const exists = await userService.checkUserNameExistance(userName);

        res.status(200).json({ exists });
    } catch (err) {
        next(err);
    }
});

userRouter.get("/myProfile", async (req: Request, res, next) => {
    try {
        if (!req.user) {
            throw new HttpError(401, ErrorCode.UNAUTHORIZED, "Not authorized");
        }
        const profile = await userService.getMyProfile(req.user.userName);
        res.status(200).send(JSON.stringify(profile));
    } catch (err) {
        next(err);
    }
});

userRouter.post("/profile", async (req: Request, res, next) => {
    try {
        if (!req.user) {
            throw new HttpError(401, ErrorCode.UNAUTHORIZED, "Not authorized");
        }
        const profileDto = zodProfileDto.parse(req.body);
        const updatedProfile = await userService.editProfile(profileDto, req.user);
        res.status(200).send(updatedProfile);
    } catch (err) {
        next(err);
    }
});

userRouter.post("/follow", async (req: Request, res, next) => {
    try {
        let success;
        if (!req.user) {
            throw new HttpError(401, ErrorCode.UNAUTHORIZED, "Not authorized");
        }
        const {followingUserName} = req.body;
        if (!followingUserName) {
            throw new HttpError(400, ErrorCode.MISSING_FOLLOWING_USERNAME, "Missing following username");
        }
        const followRequest: FollowRequest = {followerUserName: req.user.userName, followingUserName};
        if (req.body.isFollow){    
            success = await userService.follow(followRequest);
        }
        if (!req.body.isFollow){
            success = await userService.unfollow(followRequest);
        }
        if (!success) {
            throw new HttpError(500, ErrorCode.UNKNOWN_ERROR, "Unknown error");
        }
        res.status(200).send();
    } catch (err) {
        next(err);
    }
})


userRouter.get("/followingers", async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            throw new HttpError(400, ErrorCode.UNAUTHORIZED, "Not authorized");
        }
        const followingersRequest = zodFollowingersRequest.parse(req.query);
        const { page, limit } = followingersRequest
        let followingers: {followingers: Followinger[], totalCount: number};
        if (followingersRequest.isFollowing) {
            followingers = await userService.getFollowings(followingersRequest.userName,page,limit);
        } else {
            followingers = await userService.getFollowers(followingersRequest.userName,page,limit);
        
        }
        res.status(200).send(followingers);
    }catch (err) {
        next(err);
    }
})